# Kiểm tra Journie: từ chọn thông số đến lịch trình

Bộ kiểm tra cho đường đi **phần chọn sẵn (ngày đi, số ngày, ngân sách) + phần kể thêm → BE (Gemini) → địa điểm thật từ BE → lịch trình → chỉnh sửa chuyến**, chạy với BE thật. Các ca xếp từ đơn giản đến phức tạp:

| Mức | Nội dung |
|---|---|
| 1 | Chỉ chọn thông số, không kể thêm (không gọi Gemini) |
| 2 | Một mong muốn đơn giản (bảo tàng, phở, cà phê, công viên, chợ, bánh mì, hải sản, tiếng Anh) |
| 3 | Nhiều mong muốn cùng lúc |
| 4 | Tránh và phủ định (không cà phê, không hải sản, không phở, dị ứng, ăn chay...) |
| 5 | Địa điểm bắt buộc và ưu tiên (có nơi không có trong dữ liệu) |
| 6 | Giờ giấc, nhịp độ, phương tiện |
| 7 | Chữ gõ lệch phần đã chọn (phần chọn sẵn luôn thắng), nơi chưa hỗ trợ |
| 8 | Đoạn văn dài, lời dặn chen vào, chuỗi vô nghĩa, mâu thuẫn, chuyến 7 ngày |
| 9 | Chỉnh sửa chuyến đã lập: chỉ quán bị câu sửa nhắc tới thay đổi, còn lại giữ nguyên |

| File | Là gì |
|---|---|
| `prompts.json` | Các ca: phần chọn sẵn, phần kể thêm, và điều mong đợi (`expect`; ca mức 9 có thêm `edit`) |
| `run-in-browser.js` | Dán vào Console của app đang chạy: chạy từng ca qua code thật của app (`analyzeRequest`, `generateItinerary`, `adjustItinerary`), đếm số request thật gửi tới BE, đối chiếu với `expect` |
| `results.json` | Kết quả chạy gần nhất (thẻ Journie hiểu, lịch trình, từng phép kiểm tra, số lần gọi BE) |
| `results.md` | Bản đọc được của `results.json` |
| `make_report.py` | Tạo `results.md` từ `results.json` |

## Chạy lại

1. Chạy BE nguyên bản (`uv run fastapi dev app/main.py` trong journie-be): cần `GEMINI_API_KEY` và `DATABASE_URL` trỏ tới Postgres đã nạp địa điểm. Không có cơ sở dữ liệu thì `/retrieval` trả 503 và các ca mức 1–9 đều lỗi.
2. `npm run dev` (đã tự dùng `/api` nhờ `.env.development`), mở app, dán nội dung `run-in-browser.js` vào Console. Bước này gọi Gemini thật khoảng 60 lần (gói miễn phí giới hạn số lần gọi mỗi phút nên script nghỉ giữa các lần và tự thử lại), mất vài phút. Tiến độ ở `window.__journieProgress`, kết quả ở `window.__journie`.
3. Lưu `window.__journie` thành `results.json` (cùng các trường `generated_on`, `backend`, `model`, `places`, `totals`) rồi `python3 tests/llm/make_report.py`.

`expect` chỉ ghi điều người dùng chắc chắn mong đợi từ câu chữ, không chỉnh theo kết quả.
