#!/usr/bin/env python3
"""Regression checks for the backend bugs listed in docs/backend-bugs-fa21871.md and
docs/backend-bugs-7395b66.md.

One check per id: R1-R7, V1-V9, T1-T11, H1-H4, I1-I2, Q1-Q3 from backend-bugs-fa21871.md,
N1-N21 (section 2) from backend-bugs-7395b66.md, and D1-D6: the requests /chat produces for a
traveller who wants to drink (the extraction is written by hand: /chat is never called). Each sends the reproduction from the doc to a
running backend and asserts the FIXED behaviour, then prints PASS / FAIL / SKIP with a one-line
reason. ERROR means the check itself crashed (a bug in this script, not in the backend). The
exit code is 1 when any check fails, 2 when one errors. The long routing requests of N1-N3 are
in tests/backend/cases/.

    python3 tests/backend/check_backend.py --base http://localhost:8000

Checks that need the backend's code (repair functions, hours parser, hashes, caches, tests, eval,
docs) run only with --repo, under the backend's own interpreter:

    uv run --frozen --project /path/to/journie-be python tests/backend/check_backend.py \
        --repo /path/to/journie-be

Cost: POST /chat is never called. A /retrieval request whose interests (or `other` atoms) hold
free text that matches no taxonomy group or keyword may cost one Gemini embedding. Such requests
are counted against --embed-budget (default: enough for one full run, FREE_TEXT_REQUESTS); a
check that would go over it is skipped. Use --embed-budget 0 to spend none.

HTTP uses the standard library only. Nothing here writes to the backend repo: bytecode writing
is off and pytest runs without its cache.
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import json
import math
import os
import re
import subprocess
import sys
import time
import traceback
import unicodedata
import urllib.error
import urllib.request
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True  # never drop .pyc files into the backend repo

PASS, FAIL, SKIP, ERROR = "PASS", "FAIL", "SKIP", "ERROR"

# Free-text /retrieval requests each check may send (worst case: the fixed backend often embeds
# nothing, e.g. a negated or name-matching text). Their sum is the default --embed-budget.
FREE_TEXT_REQUESTS = {
    "R5": 1, "V1": 1, "V2": 1, "V6": 2, "V7": 1, "V8": 1, "V9": 2,
    "N10": 2, "N13": 1, "N14": 2, "N15": 3, "N16": 3, "N17": 5, "N18": 1,
    "D1": 1, "D2": 2, "D3": 2, "D4": 1, "D5": 2, "D6": 2,
}  # fmt: skip

HCMC = "Ho Chi Minh City"
START = {"lat": 10.7725, "lon": 106.6980}  # same start as the backend's integration tests
SEMANTIC_REASON = "Gợi ý theo mô tả"
NOT_FOUND_WARNING = "Không tìm thấy"
BALANCE_TOLERANCE = 0.15  # config/rules.yaml balance_tolerance
EXPLORE_WEIGHT = 0.06  # scoring.ADDED_WEIGHTS["explore"]
SEMANTIC_KEEP = 30  # sections.SEMANTIC_KEEP (semantic hits kept per free-text request)
ROUTING_TIMEOUT_S = 180

# Place ids named in the doc.
T1_IDS = [
    "ca-phe-coi-xua-b4e977", "cafe-thuc-2c0f2d", "96b-cafe-roastery-4ed744",
    "saigon-chic-coffee-ea47db", "nha-hang-chay-an-duyen-52e095", "morico-ef8c5a",
    "green-palm-gallery-40bcbf", "san-khau-kich-hoang-thai-thanh-368d13",
    "hai-an-gallery-369e91", "chua-an-phu-1e8bcd",
]  # fmt: skip
T3_BAR = "gang1968-acoustic-beer-cfdf55"
T4_IDS = [
    "parkhaus-thao-dien-df4d3d", "muteki-4a8987", "chang-modern-thai-cuisine-bbb6c4",
    "lotte-cinema-cong-hoa-b69fa6", "chua-quan-am-e3f7f5",
]  # fmt: skip

# backend-bugs-7395b66.md
CASES = Path(__file__).resolve().parent / "cases"  # long /routing requests (N1-N3)
EMPTY_NOTE = "Chưa tìm thấy địa điểm phù hợp trong dữ liệu."  # sections.EMPTY_NOTE
MUSEUM_NODES = ("attraction.museum", "attraction.gallery")  # interest_map: group museum
# Lone surrogate, sent as the JSON escape (json.dumps with ensure_ascii) so the body is ASCII.
LONE_SURROGATE = "\ud800"
# Says the last day ends at the earlier of day_end and end_at (N4).
EARLIER = re.compile(r"earlier|earliest|sooner|whichever|min\(|sớm hơn|mốc sớm", re.I)


class Fail(Exception):
    """A backend answer that is not the fixed behaviour."""


class Skip(Exception):
    """The check cannot conclude here (missing option, data, or budget)."""


# --------------------------------------------------------------------------------------- HTTP


class Ctx:
    def __init__(self, base: str, repo: Path | None, embed_budget: int, timeout: float) -> None:
        self.base = base.rstrip("/")
        self.repo = repo
        self.embed_budget = embed_budget
        self.free_text_sent = 0
        self.timeout = timeout
        self._pool: list[dict] | None = None
        self._cards: dict[str, dict] = {}

    # -- raw calls
    def call(
        self,
        method: str,
        path: str,
        body: Any = None,
        timeout: float | None = None,
        data: bytes | None = None,
    ):
        """(status, parsed body or text, seconds). json.dumps keeps NaN as NaN (T9). ``data``
        sends these exact bytes instead of ``body`` (N5: a lone surrogate as a JSON escape)."""
        if data is None and body is not None:
            data = json.dumps(body, ensure_ascii=False).encode()
        req = urllib.request.Request(
            self.base + path,
            data=data,
            headers={"Content-Type": "application/json"},
            method=method,
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as resp:
                raw, status = resp.read(), resp.status
        except urllib.error.HTTPError as exc:
            raw, status = exc.read(), exc.code
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            raise Fail(f"{method} {path}: no answer ({exc})") from None
        elapsed = time.perf_counter() - started
        try:
            parsed: Any = json.loads(raw)
        except ValueError:
            parsed = raw.decode(errors="replace")
        return status, parsed, elapsed

    def post(self, path: str, body: Any, timeout: float | None = None):
        return self.call("POST", path, body, timeout)

    # -- /retrieval
    def retrieval(self, free_text: bool | int = False, expect: int = 200, **kw: Any) -> dict:
        """POST /retrieval for an extraction built from ``kw`` (request fields selected_ids,
        section, offset, limit, seed are split off). ``free_text`` marks a request that may
        cost embeddings (True = one; an int = that many, e.g. several free-text interests in one
        request): it is counted against the budget."""
        top = {k: kw.pop(k) for k in ("selected_ids", "section", "offset", "limit", "seed") if k in kw}
        cost = int(free_text)
        if cost:
            if self.free_text_sent + cost > self.embed_budget:
                raise Skip(f"free-text budget reached (--embed-budget {self.embed_budget})")
            self.free_text_sent += cost
        status, body, _ = self.post("/retrieval", {"extraction": extraction(**kw), **top})
        if status != expect:
            raise Fail(f"/retrieval {short(kw)} -> {status} {short(body)}")
        return body

    def all_items(self, key: str, free_text: bool = False, **kw: Any) -> tuple[int, list[dict]]:
        """Every item of section ``key`` (paged by 20) and its total_matches."""
        body = self.retrieval(free_text=free_text, limit=20, **kw)
        sec = section(body, key)
        if sec is None:
            return 0, []
        items, total = list(sec["items"]), sec["total_matches"]
        while len(items) < total:
            page = self.retrieval(
                free_text=free_text, limit=20, section=key, offset=len(items), **kw
            )
            got = section(page, key)
            if not got or not got["items"]:
                break
            items += got["items"]
        return total, items

    # -- cards for /routing
    def pool(self) -> list[dict]:
        """Located cards from /retrieval, round-robin across sections so any slice mixes
        categories. Taxonomy interests only: no embedding."""
        if self._pool is None:
            body = self.retrieval(
                interests=["cafe", "food", "culture", "museum", "nightlife", "nature", "shopping"],
                limit=20,
            )
            columns = [s["items"] for s in body["sections"]]
            seen: dict[str, dict] = {}
            for row in range(max((len(c) for c in columns), default=0)):
                for col in columns:
                    if row < len(col) and col[row]["lat"] is not None and col[row]["lon"] is not None:
                        seen.setdefault(col[row]["id"], col[row])
            self._pool = list(seen.values())
            self._cards.update(seen)
        return self._pool

    def cards(self, ids: list[str]) -> list[dict]:
        """Cards for doc-named ids: from the pool, else by name through must_visit (the slug
        without its hash, folded keys match it)."""
        self.pool()
        missing = [i for i in ids if i not in self._cards]
        for k in range(0, len(missing), 20):
            names = [re.sub(r"-[0-9a-f]{6}$", "", i).replace("-", " ") for i in missing[k : k + 20]]
            body = self.retrieval(must_visit=names)
            found = body["pinned"] + [c for d in body["disambiguation"] for c in d["candidates"]]
            self._cards.update((c["id"], c) for c in found)
        if lost := [i for i in ids if i not in self._cards]:
            raise Skip(f"no /retrieval card for {lost}")
        return [self._cards[i] for i in ids]

    def card_named(self, name: str) -> dict:
        body = self.retrieval(must_visit=[name])
        if not body["pinned"]:
            raise Skip(f"must_visit {name!r} did not resolve")
        card = body["pinned"][0]
        self._cards[card["id"]] = card
        return card

    # -- /routing
    def routing(self, cards: list[dict], start_at: str, end_at: str, days: bool = True, **kw):
        body = {"places": cards, "start": START, "start_at": start_at, "end_at": end_at, **kw}
        return self.post("/routing/days" if days else "/routing", body, ROUTING_TIMEOUT_S)

    def routing_ok(self, *args: Any, **kw: Any) -> dict:
        status, body, _ = self.routing(*args, **kw)
        if status != 200:
            raise Fail(f"routing -> {status} {short(body)}")
        return body


def extraction(**kw: Any) -> dict:
    base: dict[str, Any] = {
        "destination": HCMC,
        "start_date": None,
        "end_date": None,
        "duration_days": None,
        "budget_vnd": None,
        "budget_scope": None,
        "available_start": None,
        "available_end": None,
        "interests": [],
        "must_visit": [],
        "avoid": [],
        "preferred_places": [],
        "hard_constraints": [],
        "soft_constraints": [],
        "missing_fields": [],
        "possible_conflicts": [],
        "needs_clarification": False,
    }
    unknown = set(kw) - set(base)
    if unknown:
        raise TypeError(f"not extraction fields: {sorted(unknown)}")
    return {**base, **kw}


def atom(field: str, operator: str, value: str) -> dict:
    return {"field": field, "operator": operator, "value": value}


def semantic_cap() -> int:
    """Free-text interests searched by meaning per request (backend semantic.MAX_QUERIES, docs/API.md)."""
    return 5


def section(body: dict, key: str) -> dict | None:
    return next((s for s in body["sections"] if s["key"] == key), None)


def keys(body: dict) -> list[str]:
    return [s["key"] for s in body["sections"]]


def fold(text: str) -> str:
    """Lower case, no diacritics, đ -> d (the backend's folded name keys)."""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text.replace("đ", "d")).strip()


def lower_vi(text: str) -> str:
    return unicodedata.normalize("NFC", text.lower())


def name_matches(name: str, query: str) -> bool:
    """The place is the queried one: same name, or the name followed by a branch/tagline."""
    n, q = fold(name), fold(query)
    return n == q or n.startswith(q + " ")


def short(value: Any, limit: int = 160) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def day_ids(days_body: dict) -> list[list[str]]:
    return [[p["id"] for p in d["places"]] for d in days_body["days"]]


def shares(days_body: dict) -> list[float]:
    return [
        d["busy_minutes"] / d["capacity_minutes"] for d in days_body["days"] if d["capacity_minutes"]
    ]


def opens_all_day(card: dict, opens_by: int, closes_after: int) -> bool:
    """Card hours are exactly 'Mo-Su HH:MM-HH:MM', opening by and closing after (minutes)."""
    m = re.fullmatch(r"Mo-Su (\d\d):(\d\d)-(\d\d):(\d\d)", card.get("opening_hours_raw") or "")
    if not m:
        return False
    start, end = int(m[1]) * 60 + int(m[2]), int(m[3]) * 60 + int(m[4])
    return start <= opens_by and end >= closes_after and end > start


def parallel(jobs: list[Callable[[], Any]]) -> list[Any]:
    with ThreadPoolExecutor(max_workers=len(jobs)) as ex:
        return [f.result() for f in [ex.submit(job) for job in jobs]]


# ---------------------------------------------------------------------------- check registry

CHECKS: dict[str, Callable[[Ctx], str]] = {}
NEEDS_REPO: set[str] = set()


def check(check_id: str, repo: bool = False):
    def register(fn: Callable[[Ctx], str]) -> Callable[[Ctx], str]:
        CHECKS[check_id] = fn
        if repo:
            NEEDS_REPO.add(check_id)
        return fn

    return register


def require_repo(ctx: Ctx) -> Path:
    if ctx.repo is None:
        raise Skip("needs --repo (backend code)")
    if str(ctx.repo) not in sys.path:
        sys.path.insert(0, str(ctx.repo))
    return ctx.repo


def backend(module: str):
    return importlib.import_module(module)


# ---------------------------------------------------------------------------- 1. /retrieval


@check("R1")
def check_R1(ctx: Ctx) -> str:
    """A preferred place outside every requested section gets the `preferred` section."""
    cases = [
        (["cafe"], "Dinh Độc Lập"),
        (["food"], "Dinh Độc Lập"),
        (["museum"], "Chợ Bến Thành"),
        (["nightlife"], "Phở Minh"),
        ([], "Thảo Cầm Viên"),
    ]
    out = []
    for interests, place in cases:
        status, body, _ = ctx.post(
            "/retrieval",
            {"extraction": extraction(interests=interests, preferred_places=[place]), "limit": 20},
        )
        if status != 200:
            raise Fail(f"{interests}+preferred {place!r} -> {status}")
        holder = [
            s["key"] for s in body["sections"] if any(name_matches(i["name"], place) for i in s["items"])
        ]
        if not holder:
            raise Fail(f"{interests}+preferred {place!r}: 200 but the place is in no section {keys(body)}")
        out.append(f"{'+'.join(interests) or '-'}/{place}->{holder[0]}")
    return "all 200, place shown: " + ", ".join(out)


@check("R2")
def check_R2(ctx: Ctx) -> str:
    """A required broad interest must not swallow a narrower preferred one."""
    out = []
    for broad, narrow in [("food", "cafe"), ("culture", "museum"), ("nature", "park")]:
        plain = ctx.retrieval(interests=[broad, narrow])
        hard = ctx.retrieval(
            interests=[broad, narrow], hard_constraints=[atom("interests", "include", broad)]
        )
        before, after = section(plain, narrow), section(hard, narrow)
        lost = [w for w in hard["warnings"] if NOT_FOUND_WARNING in w]
        if after is None or lost:
            raise Fail(
                f"{broad} required + {narrow}: sections {[(s['key'], s['total_matches']) for s in hard['sections']]}, warnings {lost}"
            )
        if before is not None and after["total_matches"] != before["total_matches"]:
            raise Fail(
                f"{broad} required shrinks {narrow} {before['total_matches']} -> {after['total_matches']}"
            )
        out.append(f"{broad}*+{narrow}: {narrow} {after['total_matches']}")
    return "; ".join(out)


@check("R3")
def check_R3(ctx: Ctx) -> str:
    """Street or reordered words inside another name never resolve to that place."""
    out = []
    for query in ["Củ Chi", "Chợ Lớn", "Biên Hòa", "Lê Lợi"]:
        body = ctx.retrieval(must_visit=[query])
        wrong = [p["name"] for p in body["pinned"] if not name_matches(p["name"], query)]
        if wrong:
            raise Fail(f"must_visit {query!r} pins {wrong}")
        state = "not_found" if body["not_found"] else "ambiguous" if body["disambiguation"] else "pinned"
        out.append(f"{query}:{state}")
    base_total = section(ctx.retrieval(interests=["cafe"]), "cafe")["total_matches"]
    avoided = ctx.retrieval(interests=["cafe"], avoid=["Chợ Lớn", "Lê Lợi"])
    after = section(avoided, "cafe")["total_matches"]
    if after != base_total:
        raise Fail(f"avoid ['Chợ Lớn','Lê Lợi'] drops cafes {base_total} -> {after}")
    return ", ".join(out) + f"; avoid of street names keeps cafe {after}"


@check("R4")
def check_R4(ctx: Ctx) -> str:
    """Avoiding a chain removes every branch; must_visit of a chain asks which branch."""
    base_total, base_items = ctx.all_items("cafe", interests=["cafe"])
    out = []
    for chain in ["Cộng Cà Phê", "Starbucks", "Cheese Coffee"]:
        branches = [i["name"] for i in base_items if name_matches(i["name"], chain)]
        body = ctx.retrieval(interests=["cafe"], avoid=[chain], limit=1)
        total, items = ctx.all_items("cafe", interests=["cafe"], avoid=[chain])
        left = [i["name"] for i in items if name_matches(i["name"], chain)]
        asked = [d["query"] for d in body["disambiguation"] if d["field"] == "avoid"]
        if left or asked:
            raise Fail(f"avoid {chain!r}: still suggests {left}, asks {asked}")
        if total != base_total - len(branches):
            raise Fail(f"avoid {chain!r}: cafe {base_total} -> {total}, {len(branches)} branches")
        out.append(f"{chain} -{len(branches)}")
    katinat = ctx.retrieval(must_visit=["Katinat"])
    if katinat["pinned"] or not any(len(d["candidates"]) > 1 for d in katinat["disambiguation"]):
        raise Fail(
            f"must_visit 'Katinat' pins {[p['name'] for p in katinat['pinned']]} without asking"
        )
    n = len(katinat["disambiguation"][0]["candidates"])
    return f"cafe {base_total}: avoid " + ", ".join(out) + f"; must_visit Katinat asks ({n} branches)"


@check("R5")
def check_R5(ctx: Ctx) -> str:
    """An `other eq` fact (foreign budget) must not remove the default sections silently."""
    base = ctx.retrieval(duration_days=3)
    body = ctx.retrieval(
        free_text=True,
        duration_days=3,
        hard_constraints=[atom("other", "eq", "budget exactly 75 NZD")],
    )
    if not body["sections"] and not body["warnings"]:
        raise Fail("status ok with sections [] and warnings []")
    if not {"food", "culture"} <= set(keys(body)):
        raise Fail(f"defaults lost: sections {keys(body)} (without the atom: {keys(base)})")
    return f"sections {[(s['key'], s['total_matches']) for s in body['sections']]}"


@check("R6")
def check_R6(ctx: Ctx) -> str:
    out = []
    for destination in ["Hồ Chí Minh", "HCM", "Thành phố HCM", "ho chi minh city"]:
        body = ctx.retrieval(destination=destination, interests=["cafe"])
        if body["status"] != "ok" or not body["sections"]:
            raise Fail(f"destination {destination!r}: status {body['status']}, sections {keys(body)}")
        out.append(destination)
    other = ctx.retrieval(destination="Hà Nội", interests=["cafe"])["status"]
    return f"status ok for {out}; 'Hà Nội' stays {other}"


@check("R7")
def check_R7(ctx: Ctx) -> str:
    """'Phở' (accented) matches phở places, not 'phố'; an unknown 'Phở 24' is not_found."""
    body = ctx.retrieval(must_visit=["Phở"])
    names = [p["name"] for p in body["pinned"]] + [
        c["name"] for d in body["disambiguation"] for c in d["candidates"]
    ]
    wrong = [n for n in names if not re.search(r"(?<!\w)phở(?!\w)", lower_vi(n))]
    if wrong or not names:
        raise Fail(f"must_visit 'Phở' offers {names}")
    unknown = ctx.retrieval(must_visit=["Phở 24"])
    offered = [c["name"] for d in unknown["disambiguation"] for c in d["candidates"]]
    pinned = [p["name"] for p in unknown["pinned"]]
    if not unknown["not_found"]:
        raise Fail(
            f"'Phở' fixed ({len(names)} phở places), but 'Phở 24' (not in data) gives "
            f"pinned {pinned} / choices {offered} instead of not_found"
        )
    return f"'Phở' -> {names[:3]}…; 'Phở 24' -> not_found"


@check("V1")
def check_V1(ctx: Ctx) -> str:
    """'chả' dishes and 'không thể bỏ lỡ' are not negations."""
    out, ran = [], False
    if ctx.repo is not None:
        require_repo(ctx)
        semantic = backend("app.services.retrieval.semantic")
        texts = ["bún chả", "chả giò", "chả cá Lã Vọng", "không thể bỏ lỡ", "tránh nắng giữa trưa"]
        if wrong := [t for t in texts if semantic.negated(t)]:
            raise Fail(f"negated() is True for {wrong}")
        out.append(f"negated() False for {len(texts)} phrases")
        ran = True
    try:
        body = ctx.retrieval(free_text=True, interests=["địa điểm không thể bỏ lỡ"])
    except Skip:
        if not ran:
            raise
    else:
        lost = [w for w in body["warnings"] if NOT_FOUND_WARNING in w]
        items = sum(len(s["items"]) for s in body["sections"])
        if lost or not items:
            raise Fail(f"'địa điểm không thể bỏ lỡ': {items} items, warnings {lost}")
        out.append(f"'địa điểm không thể bỏ lỡ' -> {[(s['key'], s['total_matches']) for s in body['sections']]}")
    return "; ".join(out)


@check("V2")
def check_V2(ctx: Ctx) -> str:
    """Unaccented, abbreviated and English negations skip the semantic search."""
    out, ran = [], False
    if ctx.repo is not None:
        require_repo(ctx)
        semantic = backend("app.services.retrieval.semantic")
        texts = [
            "khong qua du lich", "ko thich cho dong nguoi", "don't want touristy places",
            "don’t like crowds", "without crowds", "never too touristy",
        ]  # fmt: skip
        if missed := [t for t in texts if not semantic.negated(t)]:
            raise Fail(f"negated() is False for {missed}")
        out.append(f"negated() True for {len(texts)} phrases")
        ran = True
    try:
        body = ctx.retrieval(free_text=True, interests=["khong qua du lich"], limit=20)
    except Skip:
        if not ran:
            raise
    else:
        semantic_items = [
            i["name"] for s in body["sections"] for i in s["items"] if SEMANTIC_REASON in i["reasons"]
        ]
        if semantic_items:
            raise Fail(f"'khong qua du lich' finds by meaning: {semantic_items[:4]}")
        out.append(f"'khong qua du lich' -> no '{SEMANTIC_REASON}' item")
    return "; ".join(out)


@check("V3", repo=True)
def check_V3(ctx: Ctx) -> str:
    """QueryCache.get_many survives another request evicting its cached text mid-await."""
    require_repo(ctx)
    semantic = backend("app.services.retrieval.semantic")

    async def scenario() -> dict:
        cache = semantic.QueryCache(size=2)

        async def fast(texts: list[str]) -> list[list[float]]:
            return [[1.0] for _ in texts]

        gate = asyncio.Event()

        async def slow(texts: list[str]) -> list[list[float]]:
            await gate.wait()
            return [[2.0] for _ in texts]

        await cache.get_many(["a", "b"], fast)  # cache full
        first = asyncio.create_task(cache.get_many(["a", "x"], slow))  # "a" cached, "x" not
        await asyncio.sleep(0.01)
        await cache.get_many(["c", "d"], fast)  # evicts "a" while the first one waits
        gate.set()
        return await first

    try:
        found = asyncio.run(scenario())
    except KeyError as exc:
        raise Fail(f"KeyError {exc} after a concurrent eviction (HTTP 500)") from None
    if set(found) != {"a", "x"}:
        raise Fail(f"get_many returned {sorted(found)}")
    return "eviction during the await: no KeyError, both vectors returned"


@check("V4", repo=True)
def check_V4(ctx: Ctx) -> str:
    """No pool connection is held while waiting for Gemini: 6 parallel requests, a 3 s
    embedder and a 3-connection pool with a 2 s timeout all succeed."""
    repo = require_repo(ctx)
    config = backend("app.core.config")
    db = backend("app.services.retrieval.db")
    semantic = backend("app.services.retrieval.semantic")
    service = backend("app.services.retrieval.service")
    errors = backend("app.core.errors")
    schemas = backend("app.schemas.retrieval")
    gemini = backend("app.services.gemini")
    psycopg = importlib.import_module("psycopg")
    pool_mod = importlib.import_module("psycopg_pool")

    # The backend reads its own .env (DATABASE_URL); nothing of it is printed here.
    settings = config.Settings(
        _env_file=str(repo / ".env"),
        database_schema=os.environ.get("RETRIEVAL_TEST_SCHEMA", "retrieval_test"),
        database_pool_max_size=3,
        database_timeout_seconds=2.0,
    )
    if settings.database_url is None:
        raise Skip("DATABASE_URL not set for the backend")

    async def scenario() -> tuple[list[str], list[int]]:
        pool = db.create_pool(settings)
        await pool.open()
        held_during_embed: list[int] = []
        saved = semantic.QUERY_CACHE
        semantic.QUERY_CACHE = semantic.QueryCache()  # force the embedder call
        try:

            async def one(n: int) -> str:
                borrowed = 0

                @asynccontextmanager
                async def connect():
                    nonlocal borrowed
                    try:
                        async with pool.connection() as conn:
                            borrowed += 1
                            try:
                                yield conn
                            finally:
                                borrowed -= 1
                    except (pool_mod.PoolTimeout, psycopg.OperationalError) as exc:
                        raise errors.ProblemError(503, "retrieval-db-unavailable", "x", str(exc))

                async def embed(texts: list[str]) -> list[list[float]]:
                    held_during_embed.append(borrowed)
                    await asyncio.sleep(3.0)
                    return [[0.03] * gemini.EMBEDDING_DIMENSIONS for _ in texts]

                text = f"chỗ ngồi thư giãn yên bình kiểu số {n}"
                request = schemas.RetrievalRequest.model_validate(
                    {"extraction": extraction(interests=[text])}
                )
                try:
                    await service.retrieve(connect, request, embed)
                    return "200"
                except errors.ProblemError as exc:
                    return str(exc.status)

            statuses = await asyncio.gather(*(one(n) for n in range(6)))
        finally:
            semantic.QUERY_CACHE = saved
            await pool.close()
        return list(statuses), held_during_embed

    statuses, held = asyncio.run(scenario())
    if any(s != "200" for s in statuses) or any(held):
        raise Fail(f"statuses {statuses}, connections held during the embed call {held}")
    return f"6 parallel requests with a 3 s embedder: {statuses.count('200')}x200, none held a connection"


@check("V5", repo=True)
def check_V5(ctx: Ctx) -> str:
    """Free-text interests searched by meaning are capped per request."""
    repo = require_repo(ctx)
    semantic = backend("app.services.retrieval.semantic")
    service = backend("app.services.retrieval.service")
    interests = backend("app.services.retrieval.interests")
    ext_mod = backend("app.schemas.extraction")
    cap = getattr(semantic, "MAX_QUERIES", None)
    if cap is None:
        raise Fail("semantic.MAX_QUERIES does not exist: no cap")
    texts = [f"zqx chủ đề tự do {n}" for n in range(12)]
    plan = interests.plan_interests(ext_mod.Extraction.model_validate(extraction(interests=texts)), {})
    requests = [r for r in plan.requests if r.text is not None]
    if len(requests) < 12:
        raise Skip(f"only {len(requests)} of 12 test texts are free text")
    sent: list[str] = []

    async def embed(batch: list[str]) -> list[list[float]]:
        sent.extend(batch)
        return [[0.0] for _ in batch]

    async def no_hits(conn, vector, params):
        return {}

    @asynccontextmanager
    async def connect():
        yield None

    saved = semantic.QUERY_CACHE, semantic.semantic_hits
    semantic.QUERY_CACHE, semantic.semantic_hits = semantic.QueryCache(), no_hits
    try:
        hits = {r.key: {} for r in plan.requests}
        asyncio.run(service._semantic(connect, plan.requests, {}, embed, hits, []))
    finally:
        semantic.QUERY_CACHE, semantic.semantic_hits = saved
    if len(sent) > cap:
        raise Fail(f"12 free texts sent {len(sent)} texts to the embedder (cap {cap})")
    api = (repo / "docs" / "API.md").read_text(encoding="utf-8")
    if not re.search(rf"tối đa {cap} câu", api):
        raise Fail(f"cap {cap} works but docs/API.md does not state it")
    return f"12 free texts -> {len(sent)} embedded (MAX_QUERIES {cap}); API.md states the cap"


@check("V6")
def check_V6(ctx: Ctx) -> str:
    """Picking places does not shrink a semantic section: the gap is refilled."""
    text = "quán yên tĩnh để làm việc"
    body = ctx.retrieval(free_text=True, interests=[text], limit=20)
    if not body["sections"]:
        raise Fail(f"{text!r}: no section")
    sec = body["sections"][0]
    total = sec["total_matches"]
    picked = [i["id"] for i in sec["items"][:10]]
    again = ctx.retrieval(free_text=True, interests=[text], selected_ids=picked, limit=20)
    after = next((s for s in again["sections"] if s["key"] == sec["key"]), None)
    after_total = after["total_matches"] if after else 0
    # Picked places are not suggested again (they ranked first, so they would be on page 1).
    if after and (back := [i["id"] for i in after["items"] if i["id"] in picked]):
        raise Skip(f"selected places are still suggested {back[:3]}: refill cannot be measured")
    semantic_n = sum(SEMANTIC_REASON in i["reasons"] for i in sec["items"])
    if after_total >= total:
        return (
            f"total_matches {total} -> {after_total} with {len(picked)} of them selected "
            f"(selected ones gone, gap refilled)"
        )
    if total < SEMANTIC_KEEP:
        raise Skip(
            f"only {total} matches above the similarity floor: nothing to refill from "
            f"({total} -> {after_total} with {len(picked)} selected)"
        )
    raise Fail(f"total_matches {total} -> {after_total} with {len(picked)} selected ({semantic_n} semantic on page 1)")


@check("V7")
def check_V7(ctx: Ctx) -> str:
    """A free-text wish merged into a group section ranks by closeness, not by the shuffle."""
    wish = "quán yên tĩnh để ngồi làm việc"
    body = ctx.retrieval(
        free_text=True,
        interests=["cafe"],
        soft_constraints=[atom("other", "prefer", wish)],
        limit=20,
    )
    sec = section(body, "cafe")
    if sec is None:
        raise Fail(f"no cafe section: {keys(body)}")
    matches = [i["score_parts"].get("match", 0.0) for i in sec["items"]]
    merged = wish in sec.get("matched_keywords", []) or any(
        SEMANTIC_REASON in i["reasons"] for i in sec["items"]
    )
    if not merged:
        raise Skip(f"the wish was not merged into cafe (sections {keys(body)})")
    distinct = sorted(set(matches), reverse=True)
    if len(distinct) < 2:
        raise Fail(f"all {len(matches)} cafe items have match {distinct}: closeness has no effect")
    return f"cafe match values {distinct[:4]}… ({len(distinct)} distinct over {len(matches)} items)"


@check("V8")
def check_V8(ctx: Ctx) -> str:
    """A semantic-only section is ordered by closeness (the closest place near the top)."""
    text = "chỗ có view đẹp để ngắm hoàng hôn"
    body = ctx.retrieval(free_text=True, interests=[text], limit=20)
    secs = [s for s in body["sections"] if any(SEMANTIC_REASON in i["reasons"] for i in s["items"])]
    if not secs:
        raise Fail(f"{text!r}: no semantic section ({keys(body)})")
    items = secs[0]["items"]
    matches = [i["score_parts"].get("match", 0.0) for i in items]
    top = matches.index(max(matches))
    inversions = [
        (a, b)
        for a in range(len(matches))
        for b in range(a + 1, len(matches))
        if matches[b] - matches[a] > EXPLORE_WEIGHT + 0.002
    ]
    banana = next((n for n, i in enumerate(items, 1) if "banana mama" in fold(i["name"])), None)
    detail = f"closest at rank {top + 1}, Banana Mama rank {banana}, match {matches[:5]}"
    if top > 2 or inversions:
        raise Fail(f"{detail}, {len(inversions)} inversions beyond the explore weight")
    return detail


@check("V9")
def check_V9(ctx: Ctx) -> str:
    """'phở' is matched by words only: no 'Gợi ý theo mô tả' hit such as 'Đông Phố'."""
    body = ctx.retrieval(free_text=True, interests=["phở"], limit=20)
    if not body["sections"]:
        raise Fail("'phở': no section")
    sec = body["sections"][0]
    items = list(sec["items"])
    if sec["total_matches"] > len(items):
        page = ctx.retrieval(
            free_text=True, interests=["phở"], limit=20, section=sec["key"], offset=len(items)
        )
        items += page["sections"][0]["items"] if page["sections"] else []
    by_meaning = [i["name"] for i in items if SEMANTIC_REASON in i["reasons"]]
    pho_street = [
        i["name"] for i in items if "phố" in lower_vi(i["name"]) and "phở" not in lower_vi(i["name"])
    ]
    if by_meaning or pho_street:
        raise Fail(f"'phở' suggests by meaning {by_meaning}, 'phố' names {pho_street}")
    return f"'phở': {sec['total_matches']} matches, none by meaning, no 'phố' name (checked {len(items)})"


# ---------------------------------------------------------------------------- 2. /routing


@check("T1")
def check_T1(ctx: Ctx) -> str:
    """Days are balanced within the tolerance when a balanced split exists."""
    cards = ctx.cards(T1_IDS)
    body = ctx.routing_ok(cards, "2026-11-21T08:00", "2026-11-22T21:00")
    loads = shares(body)
    rules = [w for w in body["warnings"] if w.startswith(("day_max", "day_spread"))]
    counts = [len(d["places"]) for d in body["days"]]
    if max(loads) - min(loads) > BALANCE_TOLERANCE + 0.01 or rules:
        raise Fail(f"10 places / 2 days: counts {counts}, loads {[round(x, 2) for x in loads]}, warnings {rules}")
    twenty = ctx.pool()[:20]
    long = ctx.routing_ok(twenty, "2026-11-21T08:00", "2026-12-04T21:00")
    long_loads = shares(long)
    empty = sum(1 for d in long["days"] if not d["places"])
    if max(long_loads) - min(long_loads) > BALANCE_TOLERANCE + 0.01:
        raise Fail(
            f"10 places ok {counts}; 20 places / 14 days: {empty} empty days, "
            f"spread {max(long_loads) - min(long_loads):.2f}, counts {[len(d['places']) for d in long['days']]}"
        )
    return (
        f"10/2: counts {counts}, spread {max(loads) - min(loads):.2f}; "
        f"20/14: {empty} empty days, spread {max(long_loads) - min(long_loads):.2f}"
    )


def _t2_sample(ctx: Ctx, cards: list[dict]) -> tuple[bool, str]:
    """(True, split) when resending the /routing/days split as pins keeps every place on both
    endpoints, else (False, what was dropped)."""
    first = ctx.routing_ok(cards, "2026-11-21T08:00", "2026-11-22T21:00")
    by_id = {c["id"]: c for c in cards}
    placed = [(d["date"], p["id"]) for d in first["days"] for p in d["places"]]
    places = [by_id[i] for _, i in placed]
    pins = [{"id": i, "date": day} for day, i in placed]
    split = [len(d["places"]) for d in first["days"]]
    days_again, plan_again = parallel(
        [
            lambda: ctx.routing_ok(places, "2026-11-21T08:00", "2026-11-22T21:00", pins=pins),
            lambda: ctx.routing_ok(
                places, "2026-11-21T08:00", "2026-11-22T21:00", days=False, pins=pins
            ),
        ]
    )
    again = [len(d["places"]) for d in days_again["days"]]
    timed = [len(d["stops"]) for d in plan_again["days"]]
    if again != split or timed != split:
        dropped = [(u["poi"]["id"], u["reason"]) for u in days_again["unscheduled"] + plan_again["unscheduled"]]
        return False, f"split {split} -> /routing/days {again}, /routing {timed}, dropped {dropped[:3]}"
    return True, "+".join(map(str, split))


@check("T2")
def check_T2(ctx: Ctx) -> str:
    """Pinning every place to the day /routing/days chose keeps all of them on both endpoints."""
    pool = ctx.pool()
    if len(pool) < 80:
        raise Skip(f"pool has {len(pool)} located cards, need 80")
    samples = [pool[:40], pool[40:80], pool[20:60], pool[10:50]]
    results = parallel([lambda s=s: _t2_sample(ctx, s) for s in samples])
    if problems := [text for ok, text in results if not ok]:
        raise Fail(f"{len(problems)}/{len(samples)} samples: " + " | ".join(problems))
    splits = ", ".join(text for _, text in results)
    return f"{len(samples)} samples of 40 places, splits {splits}: all kept when pinned, on both endpoints"


@check("T3")
def check_T3(ctx: Ctx) -> str:
    """No place is `no_time` while it still fits on a day (with the same split, pinned)."""
    bar = ctx.cards([T3_BAR])[0]
    pool = [c for c in ctx.pool() if c["id"] != T3_BAR]
    out, tried = [], 0
    # 16 places as in the doc, then 20 and 24 so that some really do not fit.
    for sample in [pool[:15] + [bar], pool[15:30] + [bar], pool[30:49] + [bar], pool[:23] + [bar]]:
        body = ctx.routing_ok(sample, "2026-11-21T08:00", "2026-11-22T21:00")
        by_id = {c["id"]: c for c in sample}
        placed = [(d["date"], p["id"]) for d in body["days"] for p in d["places"]]
        no_time = [u["poi"]["id"] for u in body["unscheduled"] if u["reason"] == "no_time"]
        for missing in no_time[:4]:
            tried += 1
            for d in body["days"]:
                places = [by_id[i] for _, i in placed] + [by_id[missing]]
                pins = [{"id": i, "date": day} for day, i in placed] + [
                    {"id": missing, "date": d["date"]}
                ]
                retry = ctx.routing_ok(places, "2026-11-21T08:00", "2026-11-22T21:00", pins=pins)
                if not retry["unscheduled"]:
                    raise Fail(
                        f"{missing} reported no_time, but fits on {d['date']} with the same split "
                        f"(day ended {d['busy_minutes']}/{d['capacity_minutes']} min)"
                    )
        out.append(f"{len(placed)}/{len(sample)} placed, {len(no_time)} no_time")
    if not tried:
        raise Skip("no sample left a place no_time: nothing to try (" + "; ".join(out) + ")")
    return "; ".join(out) + f" ({tried} no_time places tried pinned on every day: none fits)"


@check("T4")
def check_T4(ctx: Ctx) -> str:
    """No two food stops in a row when another stop fits between them."""
    cards = ctx.cards(T4_IDS)
    body = ctx.routing_ok(cards, "2026-11-21T08:00", "2026-11-21T21:00", days=False)
    stops = [s for d in body["days"] for s in d["stops"]]
    cats = [(s["poi"]["category"] or "") for s in stops]
    food = [c == "food" or c.startswith("food.") for c in cats]
    adjacent = [
        (stops[k]["poi"]["name"], stops[k + 1]["poi"]["name"])
        for k in range(len(stops) - 1)
        if food[k] and food[k + 1]
    ]
    warn = [w for w in body["warnings"] if w.startswith("not_adjacent")]
    order = [f"{s['start'][11:16]} {c}" for s, c in zip(stops, cats)]
    if adjacent or warn:
        raise Fail(f"food in a row {adjacent}, warnings {warn}, order {order}")
    return f"{len(stops)} stops, no food pair: {order}"


@check("T5")
def check_T5(ctx: Ctx) -> str:
    """12 concurrent /routing (50 places, 2 days) all succeed."""
    cards = ctx.pool()[:50]
    if len(cards) < 50:
        raise Skip(f"pool has {len(cards)} located cards, need 50")
    results = parallel(
        [
            lambda: ctx.routing(cards, "2026-11-21T08:00", "2026-11-22T21:00", days=False)
            for _ in range(12)
        ]
    )
    statuses = [s for s, _, _ in results]
    times = sorted(round(t, 1) for _, _, t in results)
    if any(s != 200 for s in statuses):
        bad = next(b for s, b, _ in results if s != 200)
        raise Fail(f"statuses {statuses}, e.g. {short(bad)}; times {times}")
    return f"12x200 in {times[0]}-{times[-1]} s"


@check("T6")
def check_T6(ctx: Ctx) -> str:
    """A day too short for any visit gives `no_time`, never `closed_on_trip_days`."""
    noon = [c for c in ctx.pool() if opens_all_day(c, 11 * 60, 14 * 60)][:6]
    morning = [c for c in ctx.pool() if opens_all_day(c, 7 * 60, 10 * 60)][:6]
    if len(noon) < 6 or len(morning) < 6:
        raise Skip(f"pool has {len(noon)}/{len(morning)} places open every day at noon/morning")
    short_day = ctx.routing_ok(noon, "2026-11-21T12:00", "2026-11-21T12:30")
    reasons = sorted({u["reason"] for u in short_day["unscheduled"]})
    if reasons != ["no_time"] or len(short_day["unscheduled"]) != 6:
        raise Fail(f"12:00-12:30, 6 places open: reasons {[u['reason'] for u in short_day['unscheduled']]}")
    night = ctx.routing_ok(morning, "2026-11-20T22:00", "2026-11-21T09:00")
    closed = [u["poi"]["id"] for u in night["unscheduled"] if u["reason"] == "closed_on_trip_days"]
    if closed:
        raise Fail(f"22:00 -> 09:00: open-every-morning places called closed_on_trip_days: {closed}")
    others = [u["reason"] for u in night["unscheduled"]]
    return f"12:00-12:30: 6x no_time; 22:00->09:00: reasons {others}"


@check("T7")
def check_T7(ctx: Ctx) -> str:
    """The same 50-place, 14-day request sent 4 times in parallel gives identical days."""
    cards = ctx.pool()[:50]
    if len(cards) < 50:
        raise Skip(f"pool has {len(cards)} located cards, need 50")
    results = parallel(
        [lambda: ctx.routing(cards, "2026-11-21T08:00", "2026-12-04T21:00") for _ in range(4)]
    )
    if any(s != 200 for s, _, _ in results):
        raise Fail(f"statuses {[s for s, _, _ in results]}")
    plans = [json.dumps(day_ids(b)) for _, b, _ in results]
    times = [round(t, 1) for _, _, t in results]
    if len(set(plans)) > 1:
        counts = [[len(d) for d in day_ids(b)] for _, b, _ in results]
        raise Fail(f"{len(set(plans))} different plans, places per day {counts}, times {times} s")
    return f"4 parallel runs, one plan, times {times} s"


@check("T8")
def check_T8(ctx: Ctx) -> str:
    """An end at 00:00 closes the day before: no phantom day, 14 days up to midnight pass."""
    dinh = ctx.card_named("Dinh Độc Lập")
    cards = [dinh] + [c for c in ctx.pool() if c["id"] != dinh["id"]][:4]
    body = ctx.routing_ok(cards, "2026-11-21T08:00", "2026-11-23T00:00")
    dates = [d["date"] for d in body["days"]]
    if dates != ["2026-11-21", "2026-11-22"]:
        caps = [(d["date"], d["capacity_minutes"]) for d in body["days"]]
        raise Fail(f"end 2026-11-23T00:00 gives days {caps}")
    pinned = ctx.routing_ok(
        cards, "2026-11-21T08:00", "2026-11-23T00:00", pins=[{"id": dinh["id"], "date": "2026-11-22"}]
    )
    day2 = next(d for d in pinned["days"] if d["date"] == "2026-11-22")
    if dinh["id"] not in [p["id"] for p in day2["places"]]:
        raise Fail(f"Dinh Độc Lập pinned to 22/11: {[(u['poi']['id'], u['reason']) for u in pinned['unscheduled']]}")
    status, long, _ = ctx.routing(cards[:3], "2026-11-01T08:00", "2026-11-15T00:00")
    if status != 200:
        raise Fail(f"2026-11-01T08:00 -> 2026-11-15T00:00 (14 days) -> {status} {short(long)}")
    status23, _, _ = ctx.routing(
        cards, "2026-11-21T08:00", "2026-11-23T00:00", pins=[{"id": dinh["id"], "date": "2026-11-23"}]
    )
    return (
        f"days {dates}; pin on 22/11 kept; 14-day trip to midnight -> {len(long['days'])} days; "
        f"pin on 23/11 -> {status23} (outside the trip)"
    )


@check("T9")
def check_T9(ctx: Ctx) -> str:
    cards = ctx.pool()[:2]
    out = []
    for bad in [math.nan, math.inf]:
        body = {
            "places": cards,
            "start": {"lat": bad, "lon": START["lon"]},
            "start_at": "2026-11-21T08:00",
            "end_at": "2026-11-21T21:00",
        }
        status, answer, _ = ctx.post("/routing", body)
        if status != 422:
            raise Fail(f"start.lat {bad} -> {status} {short(answer)}")
        out.append(f"{bad}->422")
    status, _, _ = ctx.post(
        "/routing",
        {"places": cards, "start": {"lat": 91, "lon": 106.7}, "start_at": "2026-11-21T08:00", "end_at": "2026-11-21T21:00"},
    )
    return ", ".join(out) + f" (lat 91 -> {status})"


@check("T10")
def check_T10(ctx: Ctx) -> str:
    cards = ctx.pool()[:2]
    out = []
    for start_at in ["9999-12-31T20:00-05:00", "0001-01-01T00:00+08:00"]:
        status, answer, _ = ctx.post(
            "/routing",
            {"places": cards, "start": START, "start_at": start_at, "end_at": "2026-11-21T21:00"},
        )
        if status != 422:
            raise Fail(f"start_at {start_at} -> {status} {short(answer)}")
        out.append(f"{start_at}->422")
    return ", ".join(out)


@check("T11")
def check_T11(ctx: Ctx) -> str:
    """capacity_minutes is documented as start_at..day_end on day 1, day_start..end_at last."""
    status, spec, _ = ctx.call("GET", "/openapi.json")
    if status != 200:
        raise Fail(f"/openapi.json -> {status}")
    desc = spec["components"]["schemas"]["DayPlan"]["properties"]["capacity_minutes"].get("description", "")
    body = ctx.routing_ok(ctx.pool()[:3], "2026-11-21T14:30", "2026-11-22T12:00")
    caps = [d["capacity_minutes"] for d in body["days"]]
    if "start_at" not in desc or "end_at" not in desc:
        raise Fail(f"description {desc!r} vs capacities {caps}")
    if caps != [390, 240]:
        raise Fail(f"start 14:30, end next day 12:00 -> capacities {caps}, expected [390, 240]")
    return f"description names start_at/end_at; capacities {caps}"


# --------------------------------------------------------------- 3. /chat repair functions


def _repair(ctx: Ctx, **kw: Any):
    require_repo(ctx)
    ext_mod = backend("app.schemas.extraction")
    processing = backend("app.services.extraction.processing")
    original = ext_mod.Extraction.model_validate(extraction(**kw))
    repaired, repairs = processing.repair_extraction(original)
    issues = processing.consistency_issues(repaired)
    return repaired, repairs, issues, processing


@check("H1", repo=True)
def check_H1(ctx: Ctx) -> str:
    repaired, _, issues, processing = _repair(
        ctx,
        budget_vnd=3000000,
        hard_constraints=[atom("budget_vnd", "eq", "3000000"), atom("budget_vnd", "min", "5000000")],
        possible_conflicts=["budget_disagreement"],
        needs_clarification=True,
    )
    if "budget_disagreement" not in repaired.possible_conflicts:
        raise Fail(f"eq 3M + min 5M: conflicts {repaired.possible_conflicts}, issues {[i['code'] for i in issues]}")
    only_min, _, _, _ = _repair(
        ctx,
        hard_constraints=[atom("budget_vnd", "min", "5000000")],
        possible_conflicts=["budget_disagreement"],
        needs_clarification=True,
    )
    observed = processing.observed_conflicts(only_min)["budget_disagreement"]
    if "budget_disagreement" not in only_min.possible_conflicts or observed is not None:
        raise Fail(f"min only: observed {observed}, conflicts {only_min.possible_conflicts}")
    return "eq 3M + min 5M keeps budget_disagreement; a lone min is unknown (None), kept"


@check("H2", repo=True)
def check_H2(ctx: Ctx) -> str:
    repaired, _, _, _ = _repair(
        ctx,
        must_visit=["Dinh Độc Lập"],
        avoid=["dinh độc lập"],
        possible_conflicts=["must_visit_avoid"],
        needs_clarification=True,
    )
    if "must_visit_avoid" not in repaired.possible_conflicts or not repaired.needs_clarification:
        raise Fail(
            f"conflicts {repaired.possible_conflicts}, needs_clarification {repaired.needs_clarification}"
        )
    return "case-only difference still a must_visit_avoid conflict, needs_clarification true"


@check("H3", repo=True)
def check_H3(ctx: Ctx) -> str:
    repaired, _, issues, _ = _repair(
        ctx,
        must_visit=["Dinh Độc Lập"],
        avoid=["Chợ Bến Thành"],
        possible_conflicts=["must_visit_avoid", "must_visit_avoid"],
        needs_clarification=False,
    )
    codes = [i["code"] for i in issues]
    if repaired.possible_conflicts or repaired.needs_clarification or "conflict_metadata_mismatch" in codes:
        raise Fail(
            f"conflicts {repaired.possible_conflicts}, needs_clarification "
            f"{repaired.needs_clarification}, issues {codes}"
        )
    return "duplicated disproved conflict removed entirely, needs_clarification false"


@check("H4", repo=True)
def check_H4(ctx: Ctx) -> str:
    repaired, _, issues, processing = _repair(ctx, must_visit=["Dinh Độc Lập", "Dinh Độc Lập"])
    atoms = [
        a for a in repaired.hard_constraints + repaired.soft_constraints if a.field == "must_visit"
    ]
    codes = [i["code"] for i in issues]
    twice, _ = processing.repair_extraction(repaired)
    if len(atoms) != 1 or "duplicate_atom" in codes:
        raise Fail(f"{len(atoms)} must_visit atoms, issues {codes}")
    if twice.model_dump() != repaired.model_dump():
        raise Fail("a second repair changes the result")
    return "one must_visit atom, no duplicate_atom, repair is idempotent"


# ------------------------------------------------------------------------------- 4. ingest


@check("I1", repo=True)
def check_I1(ctx: Ctx) -> str:
    require_repo(ctx)
    ingest = backend("app.services.retrieval.ingest")
    bad = [
        {"mon": [["12:00", "12:75"]]},
        {"mon": [["08:00", "1_7:00"]]},
        {"mon": [[" 8:00", "17:00"]]},
        {"Mon": [["08:00", "17:00"]]},
        {"mon": [["08:00", "24:30"]]},
    ]
    kept = [h for h in bad if ingest.readable_hours(h) is not None]
    good = {"mon": [["08:00", "17:00"]], "sun": [["18:30", "24:00"]]}
    if kept:
        raise Fail(f"readable_hours keeps {kept}")
    if ingest.readable_hours(good) is None:
        raise Fail(f"readable_hours drops valid {good}")
    importer = (ctx.repo / "scripts" / "import_parquet.py").read_text(encoding="utf-8")
    if "unreadable opening hours" not in importer:
        raise Fail("importer prints no warning for hours stored as unknown")
    return f"{len(bad)} malformed hours -> None (importer warns on each); valid hours kept"


@check("I2", repo=True)
def check_I2(ctx: Ctx) -> str:
    require_repo(ctx)
    semantic = backend("app.services.retrieval.semantic")
    text = semantic.document_text("Dinh Độc Lập", "Di tích lịch sử")
    a = semantic.document_hash("gemini-embedding-2", text)
    b = semantic.document_hash("models/gemini-embedding-2", text)
    if a != b:
        raise Fail("document_hash differs for 'x' and 'models/x'")
    if a == semantic.document_hash("gemini-embedding-3", text):
        raise Fail("document_hash ignores the model name")
    return "same hash for 'gemini-embedding-2' and 'models/gemini-embedding-2'"


# ------------------------------------------------------------------- 5. tests, eval, docs


def _run(ctx: Ctx, args: list[str], timeout: int) -> subprocess.CompletedProcess:
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    env.pop("VIRTUAL_ENV", None)  # let uv pick the backend's own environment
    return subprocess.run(
        args, cwd=ctx.repo, env=env, capture_output=True, text=True, timeout=timeout
    )


def _tail(proc: subprocess.CompletedProcess, lines: int = 1) -> str:
    out = [line for line in (proc.stdout + proc.stderr).splitlines() if line.strip()]
    return " | ".join(out[-lines:])


@check("Q1", repo=True)
def check_Q1(ctx: Ctx) -> str:
    require_repo(ctx)
    proc = _run(
        ctx, ["uv", "run", "--frozen", "pytest", "-m", "integration", "-q", "-p", "no:cacheprovider"], 900
    )
    summary = _tail(proc)
    if proc.returncode != 0:
        failed = [l for l in proc.stdout.splitlines() if l.startswith(("FAILED", "ERROR"))]
        raise Fail(f"exit {proc.returncode}: {summary}; {failed[:4]}")
    if " skipped" in summary and " passed" not in summary:
        raise Skip(f"integration tests skipped: {summary}")
    return summary


@check("Q2", repo=True)
def check_Q2(ctx: Ctx) -> str:
    require_repo(ctx)
    proc = _run(ctx, ["uv", "run", "--frozen", "python", "eval/run_eval.py", "--no-semantic"], 900)
    text = proc.stdout + proc.stderr
    summary = [
        re.sub(r"\s*\|\s*", " ", line).strip()
        for line in text.splitlines()
        if re.match(r"\|\s*(cases passing all checks|must_not_contain violations)\s*\|", line)
    ]
    failing = [m[1] for l in text.splitlines() if (m := re.match(r"FAIL (\S+)", l))]
    if proc.returncode != 0:
        raise Fail(f"exit {proc.returncode}: {', '.join(summary)}; failing {failing[:6] or _tail(proc, 3)}")
    return f"exit 0: {', '.join(summary)}"


@check("Q3", repo=True)
def check_Q3(ctx: Ctx) -> str:
    repo = require_repo(ctx)
    api = (repo / "docs" / "API.md").read_text(encoding="utf-8")
    route = (repo / "app" / "api" / "routes" / "routing.py").read_text(encoding="utf-8")
    problems = []
    if m := re.search(r"(?<![\d.,])100 địa điểm", api):
        problems.append(f"API.md still says {m[0]!r}")
    for name, text in [("API.md", api), ("routes/routing.py", route)]:
        for word in ["placeholder", "giá trị tạm"]:
            if word in text.lower():
                problems.append(f"{name} says {word!r}")
    if problems:
        raise Fail("; ".join(problems))
    return "no '100 địa điểm', no 'placeholder'/'giá trị tạm' in API.md or routes/routing.py"


# ------------------------------------- 6. backend-bugs-7395b66.md: /routing (N1-N5)


def case(name: str) -> dict:
    """A request body from tests/backend/cases/."""
    return json.loads((CASES / name).read_text(encoding="utf-8"))


def routing_case(ctx: Ctx, path: str, name: str) -> dict:
    """POST a request file from cases/ as it is; anything but 200 fails."""
    status, body, _ = ctx.post(path, case(name), ROUTING_TIMEOUT_S)
    if status != 200:
        raise Fail(f"{path} {name} -> {status} {short(body)}")
    return body


def day_cards(body: dict) -> list[list[dict]]:
    """Cards per day of a /routing/days (places) or /routing (stops) answer."""
    return [d["places"] if "places" in d else [s["poi"] for s in d["stops"]] for d in body["days"]]


def placed(body: dict) -> int:
    return sum(len(day) for day in day_cards(body))


def split(body: dict) -> str:
    counts = [len(day) for day in day_cards(body)]
    return f"{' + '.join(map(str, counts))} = {sum(counts)}"


@check("N1")
def check_N1(ctx: Ctx) -> str:
    """An overloaded trip keeps as many places as the fa21871 plan, which still fits."""
    pairs = [
        ("h0", "h0_req.json", "h0_oldplan_pinned.json"),
        ("h6", "h6_req.json", "h6_oldplan_pinned.json"),
    ]
    jobs: list[Callable[[], Any]] = []
    for _, req, old in pairs:
        jobs += [
            lambda req=req: routing_case(ctx, "/routing/days", req),
            lambda old=old: routing_case(ctx, "/routing", old),
        ]
    answers = parallel(jobs)
    out, fewer = [], False
    for k, (label, req, _) in enumerate(pairs):
        days, old = answers[2 * k], answers[2 * k + 1]
        out.append(
            f"{label} ({len(case(req)['places'])} places): /routing/days {split(days)}, "
            f"fa21871 plan pinned on /routing {split(old)}"
        )
        fewer = fewer or placed(days) < placed(old)
    if fewer:
        raise Fail("; ".join(out) + " (drops places the old plan still fits)")
    return "; ".join(out)


def restaurants(body: dict) -> str:
    return "/".join(
        str(sum(c["category"] == "food.restaurant" for c in day)) for day in day_cards(body)
    )


def spread_warnings(body: dict) -> list[str]:
    return [w for w in body["warnings"] if w.startswith("day_spread")]


@check("N2")
def check_N2(ctx: Ctx) -> str:
    """No day_spread warning when a split keeping the rule exists (c34_better_pinned.json)."""
    got, better = parallel(
        [
            lambda: routing_case(ctx, "/routing/days", "c34_req.json"),
            lambda: routing_case(ctx, "/routing/days", "c34_better_pinned.json"),
        ]
    )

    def summary(body: dict) -> str:
        busy = sum(d["busy_minutes"] for d in body["days"])
        rule = spread_warnings(body) or "no day_spread"
        return f"{split(body)} places, restaurants {restaurants(body)}, busy {busy} min, {rule}"

    if placed(better) < placed(got) or spread_warnings(better):
        raise Skip(f"the pinned split is no better here: {summary(better)} vs {summary(got)}")
    if spread_warnings(got):
        raise Fail(f"/routing/days: {summary(got)}; c34_better_pinned: {summary(better)}")
    return f"/routing/days: {summary(got)}"


@check("N3")
def check_N3(ctx: Ctx) -> str:
    """Pins sent in an infeasible order still keep every place (t2_case9_step-1.json)."""
    by_day, step_days, step_plan = parallel(
        [
            lambda: routing_case(ctx, "/routing/days", "t2_case9_days.json"),
            lambda: routing_case(ctx, "/routing/days", "t2_case9_step-1.json"),
            lambda: routing_case(ctx, "/routing", "t2_case9_step-1.json"),
        ]
    )
    total = len(case("t2_case9_step-1.json")["places"])
    if placed(by_day) < total:
        raise Skip(f"pins in day order already drop places: {split(by_day)} of {total}")
    dropped = {
        path: [(u["poi"]["id"], u["reason"]) for u in body["unscheduled"]]
        for path, body in [("/routing/days", step_days), ("/routing", step_plan)]
    }
    detail = (
        f"{total} places, all pinned. Day order: {split(by_day)}; step-1 order: "
        f"/routing/days {split(step_days)}, /routing {split(step_plan)}"
    )
    if any(dropped.values()):
        raise Fail(f"{detail}; dropped {dropped}")
    return detail


@check("N4")
def check_N4(ctx: Ctx) -> str:
    """capacity_minutes is documented as ending the last day at the earlier of day_end and
    end_at (or the code now runs it until end_at)."""
    status, spec, _ = ctx.call("GET", "/openapi.json")
    if status != 200:
        raise Fail(f"/openapi.json -> {status}")
    desc = spec["components"]["schemas"]["DayPlan"]["properties"]["capacity_minutes"].get(
        "description", ""
    )
    body = ctx.routing_ok(ctx.pool()[:3], "2026-11-21T06:00", "2026-11-22T23:30")
    caps = [d["capacity_minutes"] for d in body["days"]]
    if caps == [900, 930]:
        return f"capacities {caps}: the last day now runs until end_at, as described"
    stale = [] if EARLIER.search(desc) else [f"the description {short(desc, 120)!r}"]
    if ctx.repo is not None:
        lines = (require_repo(ctx) / "docs" / "API.md").read_text(encoding="utf-8").splitlines()
        windows = [
            " ".join(lines[k : k + 3]) for k, line in enumerate(lines) if "`capacity_minutes`" in line
        ]
        stale += [
            f"API.md {short(w.strip(), 140)!r}"
            for w in windows
            if "end_at" in w and not EARLIER.search(w)
        ]
    if stale:
        raise Fail(
            f"start_at 06:00, end_at next day 23:30, day 08:00-21:00 -> capacities {caps} (the "
            f"last day stops at day_end), but {' and '.join(stale)} "
            f"{'say' if len(stale) > 1 else 'says'} it runs until end_at"
        )
    where = "description and API.md" if ctx.repo else "description"
    return f"capacities {caps}; the {where} name the earlier of day_end and end_at"


@check("N5")
def check_N5(ctx: Ctx) -> str:
    """A lone surrogate in a card's text gives 422 (or a 200 that renders it), never 500."""
    cards = [dict(c) for c in ctx.pool()[:2]]
    cards[0]["name"] = LONE_SURROGATE
    body = {
        "places": cards,
        "start": START,
        "start_at": "2026-11-21T08:00",
        "end_at": "2026-11-21T21:00",
    }
    data = json.dumps(body).encode()  # ASCII: the surrogate travels as the escape \ud800
    out, bad = [], []
    for path in ["/routing", "/routing/days"]:
        status, answer, _ = ctx.call("POST", path, timeout=ROUTING_TIMEOUT_S, data=data)
        out.append(f"{path} {status}")
        if status not in (200, 422):
            bad.append(f"{path} -> {status} {short(answer, 60)}")
    control = {**body, "places": ctx.pool()[:2], "start_at": "2026-11-21T08:00" + LONE_SURROGATE}
    status, _, _ = ctx.call("POST", "/routing", data=json.dumps(control).encode())
    if bad:
        raise Fail(f"places[0].name '\\ud800': {', '.join(bad)} (in start_at it gives {status})")
    return f"places[0].name '\\ud800': {', '.join(out)}; in start_at: {status}"


# ------------------------------------ 7. backend-bugs-7395b66.md: /retrieval (N6-N18)


def cafe_total(ctx: Ctx, **kw: Any) -> int:
    sec = section(ctx.retrieval(interests=["cafe"], limit=1, **kw), "cafe")
    return sec["total_matches"] if sec else 0


def name_choices(body: dict) -> list[str]:
    return [c["name"] for d in body["disambiguation"] for c in d["candidates"]]


def branch_of(name: str, query: str) -> bool:
    """The name is the query itself or the query plus a branch part ' (…)' / ' - …'."""
    n, q = fold(name), fold(query)
    return n == q or n.startswith((q + " (", q + " - "))


def in_branch_part_only(name: str, query: str) -> bool:
    """The query occurs in the name only inside its '(…)' part (a street, an address)."""
    q = fold(query)
    return q in fold(name) and q not in fold(re.sub(r"\([^)]*\)", " ", name))


def top_of(category: str | None) -> str:
    return (category or "").split(".")[0]


def found_by_meaning(sec: dict) -> bool:
    return any(SEMANTIC_REASON in i["reasons"] for i in sec["items"])


def semantic_section(body: dict) -> dict | None:
    return next((s for s in body["sections"] if found_by_meaning(s)), None)


@check("N6")
def check_N6(ctx: Ctx) -> str:
    """A name not in the data is not_found, not a choice of places sharing its first word."""
    out, wrong = [], []
    for query in ["Phở 24", "Phở Lệ", "Bún Bò 24"]:
        body = ctx.retrieval(must_visit=[query])
        names = [p["name"] for p in body["pinned"]] + name_choices(body)
        if names or not body["not_found"]:
            wrong.append(f"must_visit {query!r} offers {names}")
        else:
            out.append(f"{query}: not_found")
    avoid = ctx.retrieval(interests=["cafe"], avoid=["Phở 24"], limit=1)
    asked = [[c["name"] for c in d["candidates"]] for d in avoid["disambiguation"] if d["field"] == "avoid"]
    if asked:
        wrong.append(f"avoid 'Phở 24' asks to choose among {asked[0]} (avoid has no answer)")
    if wrong:
        raise Fail("; ".join(wrong))
    return ", ".join(out) + "; avoid 'Phở 24' asks nothing"


@check("N7")
def check_N7(ctx: Ctx) -> str:
    """Another place whose name only starts with the query is not a branch: avoid keeps it,
    and must_visit of the one exact name pins that place."""
    base_total, base_items = ctx.all_items("cafe", interests=["cafe"])
    problems, out = [], []
    for query in ["Phát Thành", "Oasis"]:
        same = [i for i in base_items if branch_of(i["name"], query)]
        total = cafe_total(ctx, avoid=[query])
        if total == base_total - len(same):
            out.append(f"avoid {query}: cafe {base_total} -> {total}")
            continue
        _, left = ctx.all_items("cafe", interests=["cafe"], avoid=[query])
        kept = {i["id"] for i in left}
        gone = [i["name"] for i in base_items if i["id"] not in kept and not branch_of(i["name"], query)]
        problems.append(f"avoid {query!r}: cafe {base_total} -> {total}, also drops {gone}")
    for query in ["Phát Thành", "Cơm gà Hải Nam"]:
        body = ctx.retrieval(must_visit=[query])
        pinned, choices = [p["name"] for p in body["pinned"]], name_choices(body)
        if len(pinned) != 1 or fold(pinned[0]) != fold(query) or choices:
            problems.append(f"must_visit {query!r}: pinned {pinned}, asks among {choices}")
        else:
            out.append(f"must_visit {query}: pinned")
    if problems:
        raise Fail("; ".join(problems))
    return "; ".join(out)


@check("N8")
def check_N8(ctx: Ctx) -> str:
    """The full chain name ('Starbucks Coffee') covers every branch, as 'Starbucks' does."""
    base = cafe_total(ctx)
    chain, full = cafe_total(ctx, avoid=["Starbucks"]), cafe_total(ctx, avoid=["Starbucks Coffee"])
    body = ctx.retrieval(must_visit=["Starbucks Coffee"])
    pinned = [p["name"] for p in body["pinned"]]
    choices = max(
        ([c["name"] for c in d["candidates"]] for d in body["disambiguation"]), key=len, default=[]
    )
    problems = []
    if pinned or len(choices) < 2:
        problems.append(f"must_visit 'Starbucks Coffee' pins {pinned} without asking (choices {choices})")
    if full != chain:
        problems.append(f"avoid 'Starbucks Coffee': cafe {base} -> {full}, while 'Starbucks' -> {chain}")
    if problems:
        raise Fail("; ".join(problems))
    return (
        f"must_visit 'Starbucks Coffee' asks among {len(choices)}; "
        f"avoid: cafe {base} -> {full}, as 'Starbucks'"
    )


@check("N9")
def check_N9(ctx: Ctx) -> str:
    """A street inside a branch part '(…)' never resolves to that branch."""
    query = "Đường Hàm Nghi"
    body = ctx.retrieval(must_visit=[query])
    pinned = [
        f"{p['name']} ({p['score_parts'].get('name')})"
        for p in body["pinned"]
        if in_branch_part_only(p["name"], query)
    ]
    offered = [n for n in name_choices(body) if in_branch_part_only(n, query)]
    base, avoided_total = cafe_total(ctx), cafe_total(ctx, avoid=[query])
    problems = []
    if pinned or offered:
        problems.append(f"must_visit {query!r} pins {pinned}, offers {offered}")
    if avoided_total != base:
        problems.append(f"avoid {query!r}: cafe {base} -> {avoided_total}")
    if problems:
        raise Fail("; ".join(problems))
    state = "not_found" if body["not_found"] else f"pinned {[p['name'] for p in body['pinned']]}"
    return f"must_visit {query}: {state}; avoid keeps cafe {base}"


@check("N10")
def check_N10(ctx: Ctx) -> str:
    """A museum matched only by a description word stays in the required museum section."""
    word = "lịch sử"
    kw: dict[str, Any] = {
        "interests": ["museum", word],
        "hard_constraints": [atom("interests", "include", "museum")],
    }
    body = ctx.retrieval(free_text=True, limit=20, **kw)
    museum = section(body, "museum")
    museum_n = museum["total_matches"] if museum else 0
    other = next((s for s in body["sections"] if s["key"].startswith("kw:")), None)
    if other is None:
        return f"museum (required) {museum_n}; '{word}' has no section of its own"
    items = list(other["items"])
    if other["total_matches"] > len(items):
        page = section(
            ctx.retrieval(free_text=True, limit=20, section=other["key"], offset=len(items), **kw),
            other["key"],
        )
        items += page["items"] if page else []
    weak = (f"Mô tả có “{word}”", SEMANTIC_REASON)
    moved = [
        i["name"]
        for i in items
        if i["category"] in MUSEUM_NODES
        and any(r in i["reasons"] for r in weak)
        and f"Khớp “{word}”" not in i["reasons"]
    ]
    counts = f"museum (required) {museum_n}, '{word}' {other['total_matches']}"
    if moved:
        raise Fail(
            f"{counts}: {len(moved)} museums moved out of the required section on "
            f"'Mô tả có “{word}”' alone, e.g. {moved[:4]}"
        )
    return f"{counts}; no museum moved on a description word alone"


@check("N11")
def check_N11(ctx: Ctx) -> str:
    """A required broad section left empty by a narrower one does not say nothing was found."""
    body = ctx.retrieval(
        interests=["nature", "park"], hard_constraints=[atom("interests", "include", "nature")]
    )
    nature, park = section(body, "nature"), section(body, "park")
    lost = [w for w in body["warnings"] if NOT_FOUND_WARNING in w]
    shown = [(s["key"], s["total_matches"]) for s in body["sections"]]
    if park is None or not park["total_matches"]:
        raise Skip(f"no park places took nature's places: sections {shown}")
    if (nature and not nature["total_matches"] and nature.get("note") == EMPTY_NOTE) or lost:
        note = nature.get("note") if nature else None
        raise Fail(f"sections {shown}: nature (required) note {note!r}, warnings {lost}")
    note = nature.get("note") if nature else None
    return f"sections {shown}, nature note {note!r}"


@check("N12")
def check_N12(ctx: Ctx) -> str:
    """Common spellings of Ho Chi Minh City are not reported as an unsupported destination."""
    destinations = [
        "TP Ho Chi Minh", "TP. Ho Chi Minh", "Thành phố Sài Gòn", "Sài Gòn City",
        "Ho Chi Minh City, Vietnam",
    ]  # fmt: skip
    bad = []
    for destination in destinations:
        body = ctx.retrieval(destination=destination, interests=["cafe"], limit=1)
        if body["status"] != "ok" or not body["sections"]:
            bad.append(f"{destination!r} -> {body['status']}")
    if bad:
        raise Fail(f"{len(bad)}/{len(destinations)} spellings of TP.HCM: " + ", ".join(bad))
    return f"status ok for {destinations}"


@check("N13")
def check_N13(ctx: Ctx) -> str:
    """`match` stays at most 1 (docs/endpoints/retrieval.md: the strongest evidence x strength),
    unless the docs now say it can exceed 1."""
    out, ran, unbounded_doc = [], False, False
    if ctx.repo is not None:
        repo = require_repo(ctx)
        scoring = backend("app.services.retrieval.scoring")
        doc = (repo / "docs" / "endpoints" / "retrieval.md").read_text(encoding="utf-8")
        row = next((line for line in doc.splitlines() if line.startswith("| `match` |")), "")
        unbounded_doc = bool(re.search(r"vượt (quá )?1|lớn hơn 1|> ?1(?![\d.,])|exceed", row))
        hits = [
            scoring.Hit("category", "prefer"),
            scoring.Hit("structured", "prefer", "michelin"),
            scoring.Hit("name", "prefer", "phở"),
        ]
        value = scoring.match_score(hits)
        if value > 1 + 1e-9 and not unbounded_doc:
            raise Fail(
                f"match_score(category + michelin + name hit) = {value:.3f} > 1; "
                f"retrieval.md: {short(row, 100)!r}"
            )
        out.append(f"match_score(category + michelin + name) = {value:.3f}")
        ran = True
    try:
        body = ctx.retrieval(free_text=True, interests=["food", "michelin", "phở"], limit=20)
    except Skip:
        if not ran:
            raise
    else:
        found = sorted(
            ((i["score_parts"].get("match", 0.0), i["score"], i["name"]) for s in body["sections"] for i in s["items"]),
            reverse=True,
        )  # fmt: skip
        over = [f for f in found if f[0] > 1.0]
        if over and not unbounded_doc:
            match, score, name = over[0]
            raise Fail(
                f"food+michelin+phở: {len(over)} of {len(found)} cards have match > 1, e.g. "
                f"{name!r} match {match}, score {score} (retrieval.md: at most 1.0)"
            )
        out.append(f"food+michelin+phở: max match {found[0][0] if found else '-'}")
    return "; ".join(out)


@check("N14")
def check_N14(ctx: Ctx) -> str:
    """A semantic section keeps the SEMANTIC_KEEP nearest usable places of its main group,
    before and after the traveller picks some (the doc counts 132 cafes above the floor)."""
    text = "quán yên tĩnh để làm việc"
    body = ctx.retrieval(free_text=True, interests=[text], limit=20)
    sec = semantic_section(body)
    if sec is None:
        raise Fail(f"{text!r}: no section found by meaning ({keys(body)})")
    picked = [i["id"] for i in sec["items"]]
    again = ctx.retrieval(free_text=True, interests=[text], selected_ids=picked, limit=20)
    after = section(again, sec["key"])
    if after and (back := [i["id"] for i in after["items"] if i["id"] in picked]):
        raise Skip(f"selected places are still suggested {back[:3]}: refill cannot be measured")
    before_n, after_n = sec["total_matches"], after["total_matches"] if after else 0
    detail = f"total_matches {before_n} with nothing selected, {after_n} with {len(picked)} selected"
    if min(before_n, after_n) < SEMANTIC_KEEP:
        raise Fail(f"{detail} (API.md: keeps the {SEMANTIC_KEEP} nearest usable places)")
    return detail


def _n15_assemble(ctx: Ctx, text: str) -> str:
    """sections.assemble on 30 synthetic hits found by meaning (20 museums, the closest, and 10
    places of four other kinds): with 8 museums selected, the section must still be museums
    only. No database, no embedding."""
    sections_mod = backend("app.services.retrieval.sections")
    interests_mod = backend("app.services.retrieval.interests")
    poi_mod = backend("app.services.retrieval.poi")
    ext_mod = backend("app.schemas.extraction")
    plan = interests_mod.plan_interests(
        ext_mod.Extraction.model_validate(extraction(interests=[text])), {}
    )
    key = plan.requests[0].key
    others = ["food.restaurant", "entertainment.nightlife", "culture_religion.temple", "shopping.market"]
    pois, close = {}, {}
    for n in range(30):
        category = "attraction.museum" if n < 20 else others[n % 4]
        pois[f"n15-{n:02d}"] = poi_mod.Poi(f"n15-{n:02d}", f"Place {n}", "place", category)
        close[f"n15-{n:02d}"] = 1 - n / 30
    hits = {key: dict.fromkeys(pois, "semantic")}

    def shown(selected: list[str]) -> list[str]:
        results, _ = sections_mod.assemble(
            plan, pois, hits, sections_mod.ANY_TIME, frozenset(), frozenset(selected), [], 0,
            {key: close},
        )  # fmt: skip
        sec = next((r for r in results if r.spec.key == key), None)
        return [item.poi.category for item in sec.items] if sec else []

    before = shown([])
    if set(before) != {"attraction.museum"}:
        raise Skip(f"fixture: nothing selected already gives {sorted(set(before))}")
    selected = list(pois)[:8]
    after = shown(selected)
    off = [c for c in after if c != "attraction.museum"]
    detail = (
        f"assemble, 20 museums + 10 others found by meaning: {len(before)} museums; "
        f"8 museums selected: {len(after)} places"
    )
    if off:
        raise Fail(f"{detail}, {len(off)} not museums {sorted(set(off))} (main group lost)")
    return f"{detail}, all museums"


@check("N15")
def check_N15(ctx: Ctx) -> str:
    """A semantic section keeps its main group after the traveller picks its best places."""
    text = "nơi kể về lịch sử chiến tranh"
    out = []
    if ctx.repo is not None:
        require_repo(ctx)
        out.append(_n15_assemble(ctx, text))
    try:
        body = ctx.retrieval(free_text=True, interests=[text], limit=20)
        return "; ".join([*out, _n15_api(ctx, text, body)])
    except Skip as skip:
        if not out:
            raise
        return f"{out[0]}; over HTTP: skipped ({skip})"


def _n15_api(ctx: Ctx, text: str, body: dict) -> str:
    """The doc's reproduction over HTTP: select 5 museums of the section."""
    sec = semantic_section(body)
    if sec is None:
        raise Fail(f"{text!r}: no section found by meaning ({keys(body)})")
    tops = sorted({top_of(i["category"]) for i in sec["items"]})
    if len(tops) != 1:
        raise Skip(f"nothing selected: page 1 spans {tops}, no single main group to keep")
    home = tops[0]
    museums = [i["id"] for i in sec["items"] if i["category"] == "attraction.museum"][:5]
    if len(museums) < 5:
        raise Skip(f"only {len(museums)} museums on page 1 to select")
    kw: dict[str, Any] = {"interests": [text], "selected_ids": museums}
    again = ctx.retrieval(free_text=True, limit=20, **kw)
    after = section(again, sec["key"])
    detail = f"nothing selected: {sec['total_matches']} places, all {home}"
    if after is None:
        raise Fail(f"{detail}; 5 museums selected: the section is gone ({keys(again)})")
    items = list(after["items"])

    def outside() -> list[tuple[str, str]]:
        return [(i["name"], i["category"]) for i in items if top_of(i["category"]) != home]

    if not outside() and after["total_matches"] > len(items):
        page = section(
            ctx.retrieval(free_text=True, limit=20, section=sec["key"], offset=len(items), **kw),
            sec["key"],
        )
        items += page["items"] if page else []
    detail += f"; 5 museums selected: {after['total_matches']} places"
    if off := outside():
        raise Fail(f"{detail}, {len(off)} of the {len(items)} shown are not {home}: {off[:5]}")
    # The doc's case did not happen on this data: nothing shows the bug, but nothing rules it out either
    raise Skip(f"{detail}, all {home} ({len(items)} checked): the reproduction did not trigger; the --repo code check covers it")


# A wish found by meaning only, with no negation and no group alias inside it. The doc's
# "chang qua du lich" is a negation since N18 ("chẳng"), so semantic search skips it.
N16_WISH = "trời mưa đi đâu trong nhà"


@check("N16")
def check_N16(ctx: Ctx) -> str:
    """Default sections are decided once: selecting every place an `other` wish found by
    meaning does not give sections [] with 'not found' warnings for food and culture."""
    wish = atom("other", "prefer", N16_WISH)
    body = ctx.retrieval(free_text=True, soft_constraints=[wish], limit=20)
    found = [s for s in body["sections"] if found_by_meaning(s)]
    if not found:
        raise Skip(
            f"nothing found by meaning (sections {keys(body)}): the reproduction no longer reaches "
            "the default-section path"
        )
    ids: list[str] = []
    for sec in found:
        items = list(sec["items"])
        if sec["total_matches"] > len(items):
            page = section(
                ctx.retrieval(
                    free_text=True, soft_constraints=[wish], limit=20, section=sec["key"], offset=len(items)
                ),
                sec["key"],
            )
            items += page["items"] if page else []
        ids += [i["id"] for i in items]
    ids = list(dict.fromkeys(ids))[:50]
    again = ctx.retrieval(free_text=True, soft_constraints=[wish], selected_ids=ids, limit=1)
    wrong = [
        w for w in again["warnings"] if NOT_FOUND_WARNING in w and ("“food”" in w or "“culture”" in w)
    ]
    detail = (
        f"other prefer '{N16_WISH}': {len(ids)} places, all selected -> sections "
        f"{[(s['key'], s['total_matches']) for s in again['sections']]}"
    )
    if not again["sections"] or wrong:
        raise Fail(f"{detail}, warnings {wrong or again['warnings']}")
    return detail


# Five free-text wishes on distinct topics (so none loses all its places to another section),
# then the sixth, past semantic.MAX_QUERIES, from the doc.
N17_TEXTS = [
    "quán yên tĩnh để làm việc", "nơi kể về lịch sử chiến tranh",
    "chỗ có view đẹp để ngắm hoàng hôn", "chỗ ăn hải sản tươi ngon", "nơi mua quà lưu niệm",
    "chỗ k quá du lịch",
]  # fmt: skip


@check("N17")
def check_N17(ctx: Ctx) -> str:
    """A free-text interest past the semantic cap (5) is not reported as 'not found'."""
    body = ctx.retrieval(free_text=semantic_cap(), interests=N17_TEXTS, limit=20)  # one request, up to 5 embeddings
    by_meaning = [s["key"] for s in body["sections"] if found_by_meaning(s)]
    last = N17_TEXTS[-1]
    lost = [w for w in body["warnings"] if NOT_FOUND_WARNING in w and last in w]
    detail = (
        f"{len(N17_TEXTS)} free-text interests -> {len(body['sections'])} sections, "
        f"{len(by_meaning)} by meaning"
    )
    if len(by_meaning) < 5:
        raise Skip(f"{detail}: the cap of 5 is not reached, nothing to check")
    if lost:
        raise Fail(f"{detail}; warning {lost[0]!r} for a text never searched (alone it finds places)")
    return f"{detail}; no 'not found' warning for {last!r}, warnings {body['warnings']}"


@check("N18")
def check_N18(ctx: Ctx) -> str:
    """'chang' and English contractions (can't, aren't, won't, didn't) are negations."""
    out, ran = [], False
    if ctx.repo is not None:
        require_repo(ctx)
        semantic = backend("app.services.retrieval.semantic")
        texts = [
            "chang qua du lich", "places that aren't touristy", "I can't stand crowds",
            "cannot stand crowds", "won't like touristy spots", "didn't want crowds",
        ]  # fmt: skip
        if missed := [t for t in texts if not semantic.negated(t)]:
            raise Fail(f"negated() is False for {missed}")
        out.append(f"negated() True for {len(texts)} phrases")
        ran = True
    try:
        body = ctx.retrieval(free_text=True, interests=["chang qua du lich"], limit=20)
    except Skip:
        if not ran:
            raise
    else:
        semantic_items = [
            i["name"] for s in body["sections"] for i in s["items"] if SEMANTIC_REASON in i["reasons"]
        ]
        if semantic_items:
            raise Fail(
                f"'chang qua du lich' finds by meaning {len(semantic_items)} places, "
                f"e.g. {semantic_items[:4]}"
            )
        out.append(f"'chang qua du lich' -> no '{SEMANTIC_REASON}' item")
    return "; ".join(out)


# ------------------------------- 8. backend-bugs-7395b66.md: /chat repair, ingest (N19-N21)


@check("N19", repo=True)
def check_N19(ctx: Ctx) -> str:
    """Names differing only in accents still conflict (must_visit vs avoid)."""
    repaired, _, _, _ = _repair(
        ctx,
        must_visit=["Dinh Độc Lập"],
        avoid=["Dinh Doc Lap"],
        possible_conflicts=["must_visit_avoid"],
        needs_clarification=True,
    )
    if "must_visit_avoid" not in repaired.possible_conflicts:
        raise Fail(
            f"must_visit 'Dinh Độc Lập' + avoid 'Dinh Doc Lap': conflicts "
            f"{repaired.possible_conflicts}, needs_clarification {repaired.needs_clarification}"
        )
    return "accent-only difference keeps must_visit_avoid"


@check("N20", repo=True)
def check_N20(ctx: Ctx) -> str:
    """An exact budget is a lower bound too: eq 5M with max 4M conflicts, even with a min."""
    repaired, _, _, _ = _repair(
        ctx,
        budget_vnd=5000000,
        hard_constraints=[
            atom("budget_vnd", "eq", "5000000"),
            atom("budget_vnd", "max", "4000000"),
            atom("budget_vnd", "min", "1000000"),
        ],
        possible_conflicts=["budget_disagreement"],
        needs_clarification=True,
    )
    if "budget_disagreement" not in repaired.possible_conflicts:
        raise Fail(
            f"eq 5M + max 4M + min 1M: conflicts {repaired.possible_conflicts}, "
            f"budget_vnd {repaired.budget_vnd}"
        )
    return f"eq 5M + max 4M + min 1M keeps budget_disagreement (budget_vnd {repaired.budget_vnd})"


@check("N21", repo=True)
def check_N21(ctx: Ctx) -> str:
    """Only ASCII digits are read as hours."""
    require_repo(ctx)
    ingest = backend("app.services.retrieval.ingest")
    bad = [{"mon": [["08:00", "1٧:00"]]}, {"mon": [["0８:30", "17:00"]]}]
    if kept := [h for h in bad if ingest.readable_hours(h) is not None]:
        raise Fail(f"readable_hours keeps non-ASCII digits {kept} (read as 17:00 / 08:30)")
    return f"{len(bad)} hours with Arabic-Indic / fullwidth digits -> None"


# ------------------------------- 9. drinking: what /chat sends for "uống rượu", "nhậu", "uống bia"

NIGHTLIFE = "entertainment.nightlife"
BIA_HOI = [
    "bia-hoi-cuong-hoi-cde88a", "bia-hoi-cuong-nga-728af9", "bia-hoi-hai-xom-le-trong-tan-6c9b38",
    "bia-hoi-hai-xom-phan-ke-binh-40da2d", "bia-hoi-ngoc-hang-82d530",
]  # fmt: skip
QUAN_NHAU = ["quan-nhau-tu-do-505-minh-khai-36e86f", "quan-nhau-tu-do-75-yen-lang-0bbb07"]


def bar_section(body: dict, k: int = 8, min_total: int = 1, min_bars: int = 6) -> tuple[dict, int]:
    """The section with the most bars among its first k items; fails when it has fewer than
    ``min_bars`` of them or fewer than ``min_total`` matches. Returns (section, bars)."""
    best, bars = None, -1
    for sec in body["sections"]:
        n = sum(i["category"] == NIGHTLIFE for i in sec["items"][:k])
        if n > bars:
            best, bars = sec, n
    if best is None or bars < min_bars:
        got = {s["key"]: (s["total_matches"], [i["category"] for i in s["items"][:k]]) for s in body["sections"]}
        raise Fail(f"no section has {min_bars} bars among its first {k}: {short(got)}")
    if best["total_matches"] < min_total:
        raise Fail(f"{best['key']}: {best['total_matches']} matches < {min_total}")
    return best, bars


def section_named_like(body: dict, text: str) -> list[str]:
    """Keys of the sections whose key or label holds these words in this order."""
    words = fold(text).split()

    def holds(value: str) -> bool:
        have = re.findall(r"[^\W_]+", fold(value))
        return any(have[i : i + len(words)] == words for i in range(len(have) - len(words) + 1))

    return [s["key"] for s in body["sections"] if holds(s["key"]) or holds(s["label"])]


@check("D1")
def check_D1(ctx: Ctx) -> str:
    """'kiếm chỗ uống rượu' (hard `other` eq, the exact /chat output): bars, not the defaults."""
    body = ctx.retrieval(
        free_text=True, limit=20,
        hard_constraints=[atom("other", "eq", "kiếm chỗ uống rượu")],
    )  # fmt: skip
    sec, bars = bar_section(body, min_total=15)
    return f"section {sec['key']!r}: {sec['total_matches']} matches, {bars}/8 bars first"


@check("D2")
def check_D2(ctx: Ctx) -> str:
    """'đi nhậu' in Hà Nội: the quán nhậu and bia hơi places come first, and the bars follow."""
    body = ctx.retrieval(
        free_text=2, limit=20, destination="Hanoi", interests=["nhậu"],
        hard_constraints=[atom("other", "eq", "nhậu")],
    )  # fmt: skip
    first = [i["id"] for s in body["sections"] for i in s["items"][:6]]
    if missing := [i for i in QUAN_NHAU if i not in first]:
        raise Fail(f"quán nhậu not on a first page: {missing}")
    if (hoi := sum(i in first for i in BIA_HOI)) < 3:
        raise Fail(f"{hoi} of the 5 bia hơi places on a first page, need 3")
    nightlife = section(body, "nightlife")
    if nightlife is None or nightlife["total_matches"] < 10:
        raise Fail(f"bars section: {nightlife and nightlife['total_matches']} matches, need 10")
    return f"quán nhậu and {hoi} bia hơi on first pages; {nightlife['total_matches']} bars"


@check("D3")
def check_D3(ctx: Ctx) -> str:
    """'rượu' as the app sends it (interest + soft `other`): bars, not the one restaurant named Hầm Rượu."""
    body = ctx.retrieval(
        free_text=2, limit=20, interests=["rượu"], soft_constraints=[atom("other", "prefer", "rượu")]
    )
    sec, bars = bar_section(body, min_total=15)
    return f"section {sec['key']!r}: {sec['total_matches']} matches, {bars}/8 bars first"


@check("D4")
def check_D4(ctx: Ctx) -> str:
    """'tối nay muốn đi uống rượu với bạn bè' in Hà Nội: a bars section, and none for 'tối nay'."""
    body = ctx.retrieval(
        free_text=True, limit=20, destination="Hanoi",
        hard_constraints=[atom("other", "eq", "tối nay muốn đi uống rượu với bạn bè")],
    )  # fmt: skip
    sec, bars = bar_section(body, min_total=10)
    if junk := [k for w in ("tối nay", "nay") for k in section_named_like(body, w)]:
        raise Fail(f"a section is named after the time words: {junk}")
    return f"section {sec['key']!r}: {sec['total_matches']} matches, {bars}/8 bars first; no time-word section"


@check("D5")
def check_D5(ctx: Ctx) -> str:
    """Negative guards: 'không uống rượu' and 'đi chơi cùng nhau' bring no bar section or bar card."""
    out = []
    for text in ("không uống rượu", "đi chơi cùng nhau cuối tuần"):
        body = ctx.retrieval(
            free_text=True, limit=20, soft_constraints=[atom("other", "prefer", text)]
        )
        bars = [i["id"] for s in body["sections"] for i in s["items"] if i["category"] == NIGHTLIFE]
        if named := section_named_like(body, "nightlife"):
            raise Fail(f"{text!r} -> bar section {named}")
        if text.startswith("không") and bars:
            raise Fail(f"{text!r} -> {len(bars)} bar cards, e.g. {bars[:3]}")
        out.append(f"{text!r}: no bar section")
    return "; ".join(out)


@check("D6")
def check_D6(ctx: Ctx) -> str:
    """'nhậu' in HCM: only a place whose description holds the word may say 'Mô tả có “nhậu”'."""
    body = ctx.retrieval(
        free_text=2, limit=20, interests=["nhậu"], soft_constraints=[atom("other", "prefer", "nhậu")]
    )
    word = "Mô tả có “nhậu”"
    cards = {i["id"] for s in body["sections"] for i in s["items"] if word in i["reasons"]}
    if len(cards) > 3:
        raise Fail(f"{len(cards)} cards carry {word!r} (the data has 1 description with the word)")
    sec, bars = bar_section(body, min_bars=5)
    return f"{len(cards)} cards with {word!r}; section {sec['key']!r} has {bars}/8 bars first"


# ------------------------------------------------------------------------------------ runner

ORDER = (
    [f"R{n}" for n in range(1, 8)]
    + [f"V{n}" for n in range(1, 10)]
    + [f"T{n}" for n in range(1, 12)]
    + [f"H{n}" for n in range(1, 5)]
    + ["I1", "I2", "Q1", "Q2", "Q3"]
    + [f"N{n}" for n in range(1, 22)]
    + [f"D{n}" for n in range(1, 7)]
)


def run_one(ctx: Ctx, check_id: str) -> tuple[str, str, float]:
    started = time.perf_counter()
    try:
        reason = CHECKS[check_id](ctx)
        status = PASS
    except Fail as exc:
        status, reason = FAIL, str(exc)
    except Skip as exc:
        status, reason = SKIP, str(exc)
    except Exception as exc:  # a bug in this script, not a backend answer
        status = ERROR
        frame = traceback.extract_tb(exc.__traceback__)[-1]
        reason = f"{type(exc).__name__}: {exc} (line {frame.lineno})"
    return status, reason, time.perf_counter() - started


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="http://localhost:8000", help="backend base URL")
    parser.add_argument("--repo", type=Path, help="backend repo: enables the code-level checks")
    parser.add_argument(
        "--embed-budget",
        type=int,
        default=sum(FREE_TEXT_REQUESTS.values()),
        help="max free-text /retrieval requests (each may cost one Gemini embedding)",
    )
    parser.add_argument("--only", help="comma-separated ids, e.g. R1,T5")
    parser.add_argument("--timeout", type=float, default=60.0, help="HTTP timeout, seconds")
    parser.add_argument("--json", type=Path, help="also write the results to this JSON file")
    args = parser.parse_args()

    repo = args.repo.resolve() if args.repo else None
    if repo is not None and not (repo / "app").is_dir():
        parser.error(f"--repo {repo} has no app/ package")
    ctx = Ctx(args.base, repo, args.embed_budget, args.timeout)
    ids = [i.strip().upper() for i in args.only.split(",")] if args.only else ORDER
    if unknown := [i for i in ids if i not in CHECKS]:
        parser.error(f"unknown ids {unknown}")

    print(f"backend {ctx.base}  repo {repo or '-'}  free-text budget {ctx.embed_budget}")
    results = []
    for check_id in ids:
        status, reason, seconds = run_one(ctx, check_id)
        results.append({"id": check_id, "status": status, "reason": reason, "seconds": round(seconds, 1)})
        print(f"{check_id:<4} {status:<5} {seconds:5.1f}s  {reason}", flush=True)

    counts = {s: sum(r["status"] == s for r in results) for s in (PASS, FAIL, SKIP, ERROR)}
    print("-" * 72)
    print(
        "  ".join(f"{k} {v}" for k, v in counts.items())
        + f"  free-text requests sent {ctx.free_text_sent}"
    )
    if args.json:
        args.json.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    if counts[ERROR]:
        return 2
    return 1 if counts[FAIL] else 0


if __name__ == "__main__":
    sys.exit(main())
