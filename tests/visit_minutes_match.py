"""Checks that the frontend's fallback visit table (src/domain/poiFromCard.ts) matches the backend's.

    python3 tests/visit_minutes_match.py --repo /path/to/journie-be
"""

import argparse
import re
import sys
from pathlib import Path


def backend_table(repo: Path) -> tuple[dict[str, int], int]:
    text = (repo / "app/services/routing/config/visit_minutes.yaml").read_text(encoding="utf-8")
    block = text.split("\ncategories:\n", 1)[1]
    rows = re.findall(r"^  ([\w.]+): (\d+)", block.split("\n\n", 1)[0], re.M)
    return {k: int(v) for k, v in rows}, int(re.search(r"^default: (\d+)", text, re.M)[1])


def frontend_table() -> tuple[dict[str, int], int]:
    text = (Path(__file__).parents[1] / "src/domain/poiFromCard.ts").read_text(encoding="utf-8")
    block = text.split("const VISIT_MIN: Record<string, number> = {", 1)[1].split("}", 1)[0]
    rows = re.findall(r"'([\w.]+)': (\d+)", block)
    return {k: int(v) for k, v in rows}, int(re.search(r"DEFAULT_VISIT_MIN = (\d+)", text)[1])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True, help="journie-be checkout")
    back, front = backend_table(parser.parse_args().repo), frontend_table()
    assert back[0], "no categories read from the backend file"
    if back != front:
        diff = sorted(set(back[0].items()) ^ set(front[0].items()))
        sys.exit(f"tables differ: default {back[1]} vs {front[1]}; {diff}")
    print(f"ok: {len(back[0])} categories, default {back[1]}")
