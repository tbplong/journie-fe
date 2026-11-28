"""Tạo results.md (bản đọc được) từ results.json do run-in-browser.js lưu lại.

Chạy:  python3 tests/llm/make_report.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Giải thích cho các ca lệch ở lần chạy lưu trong results.json. Chỉ là chú thích, không ảnh hưởng đạt hay lệch.
NOTES = {
    "4.1": "Lỗi của app, đã sửa sau lần chạy này: Gemini liệt kê “cafe” cả ở sở thích lẫn ở mục bị loại, và app giữ lại “cafe” làm sở thích. Đã kiểm lại bằng đúng dạng trả lời đó (không gọi lại Gemini): sở thích chỉ còn văn hoá, tránh cà phê.",
    "9.5": "Do Gemini: cùng câu “ngân sách 1 triệu”, lần thì BE đọc ra 1.000.000đ, lần thì trả rỗng và đòi làm rõ. Lần này BE đòi làm rõ nên Journie hỏi lại thay vì giữ nguyên ngân sách cũ. Kỳ vọng đã đổi thành “áp dụng 1 triệu hoặc hỏi lại”.",
    "9.9": "Do Gemini: lần này BE đọc được “ngân sách chỉ 1 triệu thôi” là 1.000.000đ nên Journie áp dụng (lần khác BE trả rỗng và Journie hỏi lại). Kỳ vọng đã đổi thành “áp dụng 1 triệu hoặc hỏi lại”.",
}


def cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def vnd(amount) -> str:
    return f"{amount:,.0f}đ".replace(",", ".") if isinstance(amount, (int, float)) else "–"


def status(case: dict) -> str:
    return "LỖI" if case.get("error") else "ĐẠT" if case["pass"] else "LỆCH"


def checks_line(checks: list[dict]) -> str:
    return "; ".join(("✓ " if k["ok"] else "✗ ") + f"{k['name']} = {json.dumps(k['got'], ensure_ascii=False)}" for k in checks)


def plan_lines(plan: dict) -> list[str]:
    days: dict[int, list[str]] = {}
    for stop in plan["stops"]:
        days.setdefault(stop["day"], []).append(f"{stop['name']} ({stop['cat']})")
    lines = [f"- Ngày {day}: {', '.join(names)}" for day, names in days.items()]
    lines.append(f"- {len(plan['stops'])} điểm, chi phí ước tính {vnd(plan['cost'])} / ngân sách {vnd(plan['budget'])}; BE trả {plan['considered']} địa điểm ứng viên, loại {plan['excluded']}"
                 + (f"; không tìm thấy trong dữ liệu: {plan['notFound']}" if plan.get("notFound") else ""))
    return lines


def main() -> None:
    data = json.loads((HERE / "results.json").read_text(encoding="utf-8"))
    cases = data["cases"]
    passed = [c for c in cases if status(c) == "ĐẠT"]
    out = ["# Kết quả kiểm tra Journie", "",
           f"- Chạy lúc {data['generated_on']}, BE `{data['backend']}`, model `{data['model']}`.",
           f"- {len(passed)}/{len(cases)} ca đạt. Ca lệch hoặc lỗi: {', '.join(c['id'] for c in cases if status(c) != 'ĐẠT') or 'không có'}.",
           f"- Số lần gọi BE thật trong cả đợt: {data['totals']['chat']} lần `POST /chat` (Gemini) và {data['totals']['retrieval']} lần `POST /retrieval`.",
           "- Mỗi ca chạy đúng luồng của màn hình lập kế hoạch: phần chọn sẵn (ngày đi, số ngày, ngân sách) + phần kể thêm → BE đọc bằng Gemini (bỏ qua khi không kể thêm) → lấy địa điểm thật từ BE → lập lịch. Ca ở mức 9 chạy tiếp bước chỉnh sửa chuyến.",
           f"- Địa điểm: {data['places']}.", ""]
    levels = list(dict.fromkeys(c["level"] for c in cases))
    for level in levels:
        group = [c for c in cases if c["level"] == level]
        out += [f"## {level} ({sum(status(c) == 'ĐẠT' for c in group)}/{len(group)} đạt)", "",
                "| ID | Ca | Chọn sẵn | Kể thêm | Kết quả |", "|---|---|---|---|---|"]
        for c in group:
            f = c["form"]
            out.append(f"| {c['id']} | {cell(c['title'])} | {f['days']} ngày, {vnd(f['budget'])} | {cell(c['text'][:70] + ('…' if len(c['text']) > 70 else '')) or '(không)'} | {status(c)} |")
        out.append("")
    for c in cases:
        f = c["form"]
        out += [f"### {c['id']} · {c['title']} · {status(c)}", "",
                f"Chọn sẵn: {f['days']} ngày từ {f['startDate']}, ngân sách {vnd(f['budget'])}. Kể thêm: " + (f"> {c['text']}" if c["text"] else "(không kể thêm, không gọi Gemini)"), ""]
        if c.get("error"):
            out += [f"Lỗi: `{c['error']}`", ""]
            continue
        r = c["review"]
        out += [f"**Gọi BE**: {c['calls']['chat']} × `/chat`, {c['calls']['retrieval']} × `/retrieval`.",
                "**Journie hiểu**: " + (", ".join(f"`{x}`" for x in r["chips"]) if r["chips"] else "(không có thẻ nào)"),
                f"- sở thích {r['interests']}, loại {r['avoidTags']}, nhịp độ {r['pace']}, di chuyển {r['transport']}"
                + (f", giờ {r['dayStart']}–{r['dayEnd']}" if r["dayStart"] is not None or r["dayEnd"] is not None else "")
                + (f", mâu thuẫn {r['conflicts']}" if r["conflicts"] else "") + (", cần làm rõ" if r["needsClarification"] else "")
                + (f", điểm đến chưa hỗ trợ: {r['unsupported']}" if r["unsupported"] else "")]
        if r.get("extraction"):
            e = r["extraction"]
            out.append(f"- Gemini trả: interests {e['interests']}, avoid {e['avoid']}, must_visit {e['must_visit']}, other {e['other']}")
        out.append("")
        if c["plan"]:
            out += ["**Lịch trình**", *plan_lines(c["plan"]), ""]
        else:
            out += ["**Lịch trình**: không lập (điểm đến chưa có dữ liệu).", ""]
        out += ["**Kiểm tra**: " + checks_line(c["checks"]), ""]
        if c["id"] in NOTES:
            out += [f"_Ghi chú: {NOTES[c['id']]}_", ""]
        if c.get("edit"):
            e = c["edit"]
            out += [f"**Chỉnh sửa**: “{e['text']}” ({e['calls']['chat']} × `/chat`, {e['calls']['retrieval']} × `/retrieval`)" + (f", lỗi `{e['error']}`" if e["error"] else ""),
                    f"- Trước: {', '.join(e['before'])}", f"- Sau: {', '.join(e['after']) or '(không đổi vì lỗi)'}",
                    "- Kiểm tra: " + checks_line(c["editChecks"]), ""]
            if c["id"] in NOTES:
                out += [f"_Ghi chú: {NOTES[c['id']]}_", ""]
    (HERE / "results.md").write_text("\n".join(out), encoding="utf-8")
    print(f"Đã ghi tests/llm/results.md ({len(cases)} ca)")


if __name__ == "__main__":
    main()
