# Đánh giá Journie cho bài báo

Khác với `tests/llm` (kiểm tra chức năng, chỉ báo đạt/lệch), thư mục này đo **chỉ số** và có **đường cơ sở**, để đưa số vào bài báo.

```bash
node eval/run.mjs                  # cả hai phần (gọi Gemini thật, mất vài phút)
node eval/run.mjs itinerary        # chỉ phần lịch trình (không dùng Gemini)
node eval/run.mjs extraction --reuse   # chấm lại câu trả lời đã lưu, không tốn quota
node eval/run.mjs all --limit 5    # chạy thử 5 câu đầu
```

BE phải đang chạy (mặc định `http://127.0.0.1:8000`, đổi bằng biến `EVAL_API`). Không cần cài thêm gì, chỉ dùng Vite có sẵn để gộp `core.ts` rồi chạy bằng Node.

## Gồm gì

| File | Là gì |
|---|---|
| `queries.jsonl` | 62 câu có nhãn (ngày, ngân sách, mục quan tâm, loại trừ, địa điểm bắt buộc), nhóm A–F |
| `core.ts` | Phần tính toán, dùng lại đúng hàm của app (`extractConstraints`, `generateItinerary`, `retimeDay`, `isAvoided`) |
| `run.mjs` | Chạy, lưu kết quả, viết `results/summary.md` |
| `results/` | `extraction.raw.json` (câu trả lời gốc của BE), `extraction.json`, `itinerary.rows.json`, `itinerary.json`, `summary.md`, `be-retrieval.txt` |

## Phần A: trích ràng buộc (POST /chat)

Với mỗi câu, so kết quả BE với nhãn: số ngày, ngân sách (đúng/sai), mục quan tâm, loại trừ, địa điểm bắt buộc (precision, recall, F1). Câu nhóm F cố ý nằm ngoài từ vựng của BE ("tham quan", chuỗi vô nghĩa) để đo việc BE có bịa ra gì không. Danh sách chỗ lệch nhãn nằm ở `extraction.json`, mục `misses`.

## Phần B: lịch trình

Mỗi câu cho một kịch bản (số ngày, ngân sách, nhịp độ, phương tiện, ngày bắt đầu thay đổi luân phiên). Đầu vào là **cách đọc đúng** của câu đó, nên phần này chỉ đo bộ lập lịch, không dính lỗi của Gemini. Hai hệ thống:

1. **Journie**: `generateItinerary` (truy xuất từ BE rồi bộ xếp lịch).
2. **Đường cơ sở**: cùng các địa điểm BE trả về, giữ thứ tự của BE, cắt thành từng ngày, không qua bộ xếp lịch.

Cả hai được đặt giờ và kiểm tra bằng cùng một mô hình giờ và di chuyển (`retimeDay`): giờ mở cửa, hết giờ trong ngày, quán đóng vào thứ đó, vượt ngân sách, địa điểm bị loại, quá 3 bữa ăn một ngày, trùng địa điểm.

## Lịch sử chấm (nêu trong bài nếu dùng số này)

Lần chạy Gemini duy nhất là 62 câu; mọi lần chấm sau đó dùng lại câu trả lời đã lưu (`extraction.raw.json`). Cách chấm đã đổi sau khi xem các chỗ lệch, nên bản đầu được giữ ở `results/extraction.strict-first-pass.json` (loại trừ F1 76,9%).

1. Lần đầu: chỉ so trường thô của BE, khớp chữ theo chuỗi con.
2. Thêm tầng "như app hiện ra" (chip ở màn xem lại), vì BE trả nhiều câu loại trừ nguyên văn trong ràng buộc `other` chứ không điền `avoid`, còn app tự đọc tiếp.
3. Nới khớp chữ: bỏ khoảng trắng, "cafe" = "cà phê", "seafood" = "hải sản".
4. Sửa hai lỗi FE do BE trả biến thể không dấu ("haisan" không khớp quy tắc hải sản; chip hiện "Tránh: cho" thay vì "chợ"). Loại trừ "như app hiện ra" tăng từ F1 79,1% lên 85,7% nhờ bước này.

Việc nới khớp (bước 3) làm tăng số mà không đổi hành vi hệ thống; đừng trình bày nó như cải thiện.

## Giới hạn (phải nêu trong bài)

- **Nhãn do một người viết** và chưa ai kiểm tra độc lập. Nên nhờ người khác gán nhãn lại và tính độ đồng thuận.
- **Không có đường cơ sở dùng LLM tự xếp lịch**, vì BE chỉ có `/chat` trích ràng buộc theo khung cố định. Muốn có phải gọi thẳng Gemini bằng khoá của bạn.
- **Đường cơ sở là bản đơn giản**: thứ tự của BE, không xếp lịch. Nó cho thấy bộ xếp lịch mang lại gì, không đại diện cho các hệ khác.
- **Việc loại trừ bằng bộ xếp lịch là cưỡng chế, không phải khám phá**: bộ xếp lịch dùng đúng định nghĩa "bị loại" của bộ kiểm tra nên bằng 0 là hiển nhiên; con số có ý nghĩa là tỉ lệ của đường cơ sở (phần BE bỏ sót).
- **Chưa có khảo sát người dùng** và chưa có đo chất lượng "hay" của lịch trình, chỉ đo ràng buộc cứng.
- Phần truy xuất lấy từ `eval/run_eval.py` của BE (30 ca viết tay), chạy trên lược đồ `retrieval_test`, chưa chắc trùng dữ liệu BE đang phục vụ.
