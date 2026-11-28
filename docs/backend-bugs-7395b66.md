# Kiểm tra backend commit `7395b66` ("fix: fix bugs")

Kiểm ngày 2026-11-21 trên `main`, commit `7395b66`, ngay sau `fa21871`. Commit này sửa theo [`backend-bugs-fa21871.md`](backend-bugs-fa21871.md).

**Phạm vi** giống file trước: chỉ những gì backend **đang có** mà chạy sai. Phần còn thiếu so với use case để xét sau.

**Đã kiểm:**

| Bước | Kết quả |
|---|---|
| Unit test (`uv run pytest -q`) | 208 qua, 1 bỏ qua |
| Integration test (`uv run pytest -m integration`) | 34 qua, 1 bỏ qua (cần nhóm `bench`). Bản trước có 2 test hỏng, nay đã qua |
| Eval (`eval/run_eval.py --no-semantic`) | 35/35 ca qua, 0 vi phạm (bản trước 31/35) |
| Bộ test hồi quy mới `tests/backend/check_backend.py` (mục 3) | 36 lỗi cũ: 35 đã sửa, R7 sửa một phần |
| Review diff của commit (3 người đọc theo mảng, mỗi phát hiện có một người khác chạy lại để tìm cách bác bỏ) | 21 lỗi được xác nhận (mục 2) |

## 1. 36 lỗi của đợt trước

**35/36 đã sửa.** Mỗi lỗi được kiểm lại bằng chính bước tái hiện trong file trước. Ví dụ:

- `preferred_places` nằm ngoài các mục được hỏi giờ trả 200 (R1).
- "Củ Chi", "Chợ Lớn" không còn ghim nhầm quán (R3).
- "Tránh Cộng Cà Phê" loại đủ 4 chi nhánh (R4).
- Chia ngày 10 điểm ra 5 + 5 (trước là 9 + 1) (T1).
- 12 request `/routing` song song đều trả 200 (T5).
- Cùng một request gửi song song cho cùng một lịch (T7).

**Còn R7 (sửa một phần):** "Phở" nay chỉ gợi ý quán phở. Nhưng một tên không có trong dữ liệu vẫn ra danh sách chọn thay vì `not_found`: "Phở 24" ra Phở Anh, Phở Kim, Phở SOL, với độ tương đồng 0,364, vừa trên ngưỡng 0,35. Xem N6.

## 2. Lỗi mới, lỗi hồi quy và chỗ sửa chưa hết

Cột "Loại":
- **hồi quy**: bản `fa21871` chạy đúng, bản này sai.
- **sửa chưa hết**: lỗi cũ vẫn còn với input khác.
- **mới**: lỗi do chính thay đổi này sinh ra.

Các request routing dài có sẵn trong `tests/backend/cases/`.

### 2.1 `POST /routing/days`, `POST /routing`

| Mục | Mức | Loại | Chỗ | Lỗi | Tái hiện | Hướng sửa |
|---|---|---|---|---|---|---|
| N1 | **P1** | hồi quy (từ T7) | `app/services/routing/service.py:63`, `ils.py` | Để kết quả tất định, ILS nay dừng sau 150 lần lắc không cải thiện (`STALL_SHAKES = ils.MAX_NO_IMPROVE`). Nhưng luật khởi động lại cũng kích hoạt ở mốc 150, nên ILS dừng ngay ở lần khởi động lại đầu tiên. Với chuyến quá tải, nó **xếp được ít điểm hơn bản `fa21871`**. Thử 100 request ngẫu nhiên: 8 request ít hơn một điểm, 1 request nhiều hơn một điểm. | `cases/h0_req.json` (40 nơi, 21-23/11): `/routing/days` xếp 12 + 12 + 11 = 35. Gửi lịch của `fa21871` (`cases/h0_oldplan_pinned.json`) lên `/routing` thì xếp đủ 12 + 12 + 12 = 36, tức là điểm bị bỏ vẫn xếp được. Tương tự với `cases/h6_req.json`. | Tăng số lần lắc để ILS chạy qua vài vòng khởi động lại (ví dụ 1.000, hoặc N × `MAX_NO_IMPROVE`). Vẫn đếm theo lượt nên vẫn tất định; giữ hạn giờ làm chốt an toàn. |
| N2 | P2 | sửa chưa hết (T1) | `ils.py:278` | `rebalance` vẫn dừng ở cực trị cục bộ làm phá luật `day_spread`, và cảnh báo nói là luật không giữ được, dù có cách chia giữ được luật mà còn đi ít đường hơn. | `cases/c34_req.json` (16 nơi, 27-28/11): `/routing/days` chia 9 + 7 nơi, 6/4 nhà hàng, kèm cảnh báo `day_spread:food.restaurant` và `not_adjacent:food:2026-11-27`. Gửi cách chia trong `cases/c34_better_pinned.json` thì 5/5 nhà hàng, không còn cảnh báo `day_spread`. | Thêm nước đi mạnh hơn cho `rebalance` (dời dây chuyền A sang B sang C, hoặc dời cặp), hoặc chạy vài seed cố định rồi giữ lịch tốt nhất. |
| N3 | P2 | sửa chưa hết (T2) | `service.py:299` | `pinned_start` khởi tạo mỗi ngày bằng các nơi đã ghim **theo thứ tự trong request**. Nếu thứ tự đó không khả thi, ngày bắt đầu trống, và ILS (nay dừng sớm) không sắp lại được. Kết quả là vẫn bỏ một nơi mà `/routing/days` vừa xếp. Bản sửa chỉ đúng khi client gửi đúng thứ tự `days[].places`. Nhưng `routing-frontend.md` vẫn dặn "gửi lại đúng request của bước 1", và sau khi người dùng kéo thả thì thứ tự cũng đổi. | `cases/t2_case9_days.json` và `cases/t2_case9_step-1.json`: cùng 26 nơi, cùng 26 ghim, chỉ khác thứ tự. Thứ tự theo ngày giữ đủ 26 nơi; thứ tự của bước 1 làm cả hai endpoint bỏ `lune-restaurant-and-bar-20aae6` (`no_time`). | Khi thứ tự ghim của một ngày không khả thi, chèn lần lượt từng nơi đã ghim vào vị trí rẻ nhất còn khả thi (như `ils.fill`) thay vì để ngày trống. |
| N4 | P2 | sửa chưa hết (T11) | `app/schemas/routing.py:163`, `docs/API.md:488-490` | Mô tả mới của `capacity_minutes` ghi ngày cuối chạy "tới `end_at`", nhưng code dùng mốc sớm hơn giữa `day_end` và `end_at`. Khi `end_at` muộn hơn `day_end`, mô tả sai. | `start_at 2026-11-21T06:00`, `end_at 2026-11-22T23:30`, ngày mặc định 08:00-21:00: trả `capacity_minutes` [900, 780]. Theo mô tả thì ngày cuối phải là 930. | Ghi: ngày đầu bắt đầu từ `start_at`; ngày cuối kết thúc ở mốc sớm hơn giữa `day_end` và `end_at`. |
| N5 | P2 | sửa chưa hết (T9) | `app/core/errors.py:67` | Handler mới chỉ lo đường 422. `/routing` trả lại nguyên thẻ địa điểm client gửi. Một chuỗi có ký tự surrogate lẻ (`\ud800`) qua được kiểm tra nhưng không mã hoá được UTF-8 khi trả về, nên **500**. Lỗi này có từ `fa21871`. | `places[0].name` là chuỗi JSON `"\ud800"` trả 500; cùng ký tự đó trong `start_at` thì trả 422 bình thường. | Chặn surrogate lẻ ngay khi kiểm tra các trường chữ của thẻ, hoặc render response theo cách chịu được surrogate. |

### 2.2 `POST /retrieval`: tra tên, chia mục

| Mục | Mức | Loại | Chỗ | Lỗi | Tái hiện | Hướng sửa |
|---|---|---|---|---|---|---|
| N6 | P2 | sửa chưa hết (R7) | `app/services/retrieval/names.py:94` | Ứng viên gần đúng được giữ khi độ tương đồng ≥ 0,35, nên một tên ngắn trùng chữ đầu với nhiều quán vẫn vượt ngưỡng. | `must_visit: ["Phở 24"]` hoặc `["Phở Lệ"]` ra Phở Anh, Phở Kim, Phở SOL (0,36). `["Bún Bò 24"]` ra Bún Bò Xưa, Bún Bò Huế 14B. Không ra `not_found`. `avoid: ["Phở 24"]` thêm một mục chọn cho `avoid` mà API không có cách trả lời. | Không tính ứng viên chỉ trùng chữ đầu chung chung; nâng ngưỡng cho tên nhiều chữ; hoặc yêu cầu các chữ còn lại cũng khớp gần đúng. |
| N7 | P2 | hồi quy (từ R4) | `names.py:72` | Luật mới "tên bắt đầu bằng câu hỏi thì là cùng chuỗi" cũng gộp nhầm **hai nơi khác nhau** có tên bắt đầu giống nhau. `avoid` vì vậy loại cả nơi vô can, còn `must_visit` một tên chính xác duy nhất nay phải hỏi lại, trong khi `fa21871` ghim đúng. | `{interests: ["cafe"], avoid: ["Phát Thành"]}` (một nhà hàng) loại luôn quán "Phát Thành Coffee" ở chỗ khác: mục cafe còn 198/199. `avoid: ["Oasis"]` còn 197. `must_visit: ["Phát Thành"]` và `["Cơm gà Hải Nam"]` ra danh sách chọn thay vì ghim. | Chỉ coi là chi nhánh khi tên là câu hỏi cộng phần chi nhánh `" (…)"` hoặc `" - …"`. Khi có đúng một khoá bằng hẳn câu hỏi thì ghim nơi đó. |
| N8 | P2 | sửa chưa hết (R4) | `names.py:72` | Gõ tên chuỗi đầy đủ ("Starbucks Coffee") thì vẫn chỉ ghim hoặc tránh một chi nhánh, vì có chi nhánh tên ngắn hơn ("Starbucks (208 Trần Văn Trà)"). | `must_visit: ["Starbucks Coffee"]` ghim "Starbucks Coffee - Chung cư Saigon Mia" mà không hỏi lại. `avoid: ["Starbucks Coffee"]`: mục cafe còn 198, vẫn còn 3 chi nhánh. `avoid: ["Starbucks"]` thì còn 195. | So trên tên gốc đã bỏ phần chi nhánh và các chữ chung cuối tên (Coffee, Cafe, Cà phê). |
| N9 | P2 | sửa chưa hết (R3) | `names.py:84` | Phần địa chỉ trong ngoặc vẫn nằm trong khoá dùng để so gần đúng, nên **tên đường** vẫn ghim nhầm một chi nhánh. | `must_visit: ["Đường Hàm Nghi"]` ghim "Katinat (Đường Hàm Nghi)" (0,65). `avoid: ["Đường Hàm Nghi"]` loại chi nhánh đó: mục cafe còn 198. | Khi import, tạo thêm khoá đã bỏ phần `"(…)"` và so gần đúng trên khoá này. |
| N10 | P2 | hồi quy (từ R2) | `app/services/retrieval/sections.py:373` | Xếp "độ cụ thể trước" khiến một mục chỉ có từ khoá (độ cụ thể vô hạn) kéo nơi ra khỏi **mục bắt buộc**, chỉ nhờ một chữ yếu trong mô tả. | `{interests: ["museum", "lịch sử"], hard_constraints: [interests include museum]}`: mục bảo tàng (bắt buộc) còn 8, mục "lịch sử" có 16. Mười bảo tàng, gồm Chứng tích Chiến tranh, bị dời sang mục "lịch sử" chỉ với lý do "Mô tả có “lịch sử”". Ở `fa21871` là 17 và 7. | Chỉ ưu tiên độ cụ thể khi nơi đó khớp mạnh (tên hoặc dữ liệu có cấu trúc); khớp yếu thì xếp theo điểm như trước. |
| N11 | P2 | sửa chưa hết (R2) | `sections.py:389` | Mục rộng bắt buộc nay trống, kèm ghi chú "Chưa tìm thấy địa điểm phù hợp trong dữ liệu.", trong khi các nơi của nó nằm ở mục hẹp hơn. Thông báo "không tìm thấy" sai chỉ chuyển từ mục hẹp sang mục rộng. | `{interests: ["nature", "park"], hard_constraints: [interests include nature]}` ra mục nature (bắt buộc) 0 nơi kèm ghi chú trên, và mục park 16 nơi. | Khi mục trống chỉ vì các nơi đã sang mục cụ thể hơn: bỏ mục mà không ghi chú, hoặc ghi chú trỏ tới mục kia. |
| N12 | P2 | sửa chưa hết (R6) | `app/services/extraction/name_aliases.csv:14` | Vẫn còn nhiều cách viết TP.HCM bị báo "chưa hỗ trợ", vì khoá so khớp giữ dấu. | `destination` "TP Ho Chi Minh", "TP. Ho Chi Minh", "Thành phố Sài Gòn", "Sài Gòn City", "Ho Chi Minh City, Vietnam" đều trả `unsupported_destination`. | So trên khoá bỏ dấu, và bỏ các tiền tố hay hậu tố thường gặp ("TP", "Thành phố", "City", ", Vietnam") trước khi tra. |
| N13 | P2 | mới (từ V7) | `app/services/retrieval/scoring.py:62` | `match` nay cộng thêm phần thưởng cho mỗi lần khớp phụ nên vượt 1, trái `docs/endpoints/retrieval.md:353` (tối đa 1,0). Frontend chặn ở 100% nên nhiều nơi cùng hiện 100%. | `{interests: ["food", "michelin", "phở"]}`: các quán phở đầu mục có `match` 1,445, `score` khoảng 1,46-1,50. | Chặn `match` ở 1, ví dụ `best + share × (1 - best) × phần còn lại`; hoặc sửa tài liệu và báo rằng `score` không còn giới hạn 1. |

### 2.3 `POST /retrieval`: tìm theo nghĩa

| Mục | Mức | Loại | Chỗ | Lỗi | Tái hiện | Hướng sửa |
|---|---|---|---|---|---|---|
| N14 | P2 | sửa chưa hết (V6) | `sections.py:424` | Mục theo nghĩa vẫn co lại khi người dùng chọn dần. Hàm lấy 30 nơi gần nhất trước, rồi `prune_hits` mới bỏ các nơi ngoài nhóm chính (nhà hàng, bar trong mục quán làm việc), và không bù vào chỗ trống. Trái `API.md` ("giữ 30 nơi gần nhất còn dùng được"). | `interests: ["quán yên tĩnh để làm việc"]`: `total_matches` là 29 khi chưa chọn nơi nào, 26 khi đã chọn 30 nơi, 23 khi đã chọn 48 nơi, dù có 132 quán cà phê trên ngưỡng. | Lọc theo nhóm chính trước, rồi mới lấy 30 nơi gần nhất; hoặc bù tiếp cho tới khi đủ 30. |
| N15 | P2 | mới (từ V6) | `sections.py:424` | Nhóm chính của mục được tính sau khi đã bỏ các nơi đã chọn. Khi người dùng đã chọn hết các nơi đúng chủ đề, nhóm chính mất, và các nơi lạc đề tràn vào mục. | Câu "nơi kể về lịch sử chiến tranh": chưa chọn thì mục có 20 nơi, toàn điểm tham quan. Chọn 5 bảo tàng đầu thì mục có 30 nơi, lẫn chùa, công viên, bar, nhà hàng, chợ. | Tính nhóm chính trên toàn bộ kết quả, kể cả nơi đã chọn, rồi mới lọc. |
| N16 | P2 | mới (từ R5/V6) | `app/services/retrieval/service.py:227` | `service.retrieve` quyết định có lấy mục mặc định (food, culture) hay không dựa trên kết quả thô, còn `build_specs` dựa trên kết quả đã lọc. Hai bên lệch nhau. Nếu mọi kết quả theo nghĩa của một atom `other` đã được chọn, response rỗng kèm cảnh báo sai. | `soft_constraints: other prefer "chang qua du lich"` ra 20 nơi. Gửi lại kèm 20 nơi đó trong `selected_ids` thì `sections: []` và cảnh báo "Không tìm thấy địa điểm cho “food”", "… “culture”". | Quyết định mục mặc định một lần, trên cùng một tập kết quả cho cả hai bên. |
| N17 | P2 | mới (từ V5) | `service.py:133` | Trần 5 câu bỏ qua tìm theo nghĩa cho câu thứ 6 trở đi, rồi báo câu đó là "Không tìm thấy địa điểm", trong khi câu đó chưa hề được tìm. | 6 sở thích tự do: ra 5 mục, kèm cảnh báo "Không tìm thấy địa điểm cho “chỗ k quá du lịch”". Gửi riêng câu đó thì ra mục 20 nơi. | Với câu bị bỏ qua vì trần, dùng cảnh báo riêng ("chỉ tìm theo nghĩa 5 sở thích đầu"), không báo không tìm thấy. |
| N18 | P2 | sửa chưa hết (V2) | `app/services/retrieval/semantic.py:39` | Danh sách phủ định thiếu "chang" (chẳng không dấu, có trong hướng sửa V2) và các dạng rút gọn tiếng Anh như can't, cannot, won't, aren't, didn't. Các câu này vẫn tìm ra đúng thứ người dùng muốn tránh. | `negated()` trả False cho "chang qua du lich", "places that aren't touristy", "I can't stand crowds". `interests: ["chang qua du lich"]` ra 20 nơi, gồm Khu du lịch Văn Thánh và Giga Mall. | Thêm chang, cant, cannot, wont, arent, didnt, wasnt, shouldnt (sau khi bỏ dấu nháy), và thêm vào bảng test. |

### 2.4 `POST /chat` (bước sửa kết quả) và nhập dữ liệu

| Mục | Mức | Loại | Chỗ | Lỗi | Tái hiện | Hướng sửa |
|---|---|---|---|---|---|---|
| N19 | P2 | sửa chưa hết (H2) | `app/services/extraction/processing.py:124` | So `must_visit` và `avoid` bằng `place_key` vẫn giữ dấu, nên cùng một nơi viết có dấu và không dấu bị coi là không mâu thuẫn, và conflict bị xoá. | `must_visit: ["Dinh Độc Lập"]`, `avoid: ["Dinh Doc Lap"]`, `possible_conflicts: ["must_visit_avoid"]`: sau khi sửa thì `possible_conflicts: []`. `/retrieval` sau đó vẫn ghim nơi này, chỉ kèm một cảnh báo. | So trên khoá bỏ dấu (giống cách `/retrieval` so tên), hoặc trả None (không rõ) khi hai khoá chỉ khác dấu. |
| N20 | P2 | sửa chưa hết (H1) | `processing.py:136` | Ngân sách chính xác (`eq`) mới chỉ được coi là cận trên. Khi có thêm một atom `min`, cặp `eq 5tr` và `max 4tr` không bị coi là mâu thuẫn. | Hard `[budget_vnd eq 5000000, budget_vnd max 4000000, budget_vnd min 1000000]` với `budget_disagreement`: sau khi sửa thì `possible_conflicts: []`, `budget_vnd` bị ghi đè thành 4000000. | Coi `eq` là cả cận trên lẫn cận dưới. |
| N21 | P2 | sửa chưa hết (I1) | `app/services/retrieval/hours.py:21` | Regex giờ dùng `\d` mà không có `re.ASCII`, nên vẫn nhận chữ số không phải ASCII và đọc thành giờ khác. Dữ liệu hiện tại không có dòng nào dính. | `readable_hours({"mon": [["08:00", "1٧:00"]]})` (chữ số Ả Rập) được giữ và đọc thành 17:00. | Dùng `[0-9]` thay cho `\d`, hoặc thêm `re.ASCII`. |

## 3. Bộ test hồi quy

File: [`tests/backend/check_backend.py`](../tests/backend/check_backend.py). Mỗi lỗi có một hàm kiểm (`check_R1` … `check_Q3`). Hàm gửi đúng bước tái hiện trong file lỗi rồi kiểm hành vi **đã sửa**, in PASS / FAIL / SKIP kèm một dòng lý do. Mã thoát: 0 khi tất cả qua, 1 khi có FAIL, 2 khi chính script lỗi.

Chỉ kiểm qua API, không cần code backend:

```bash
python3 tests/backend/check_backend.py --base http://localhost:8000
```

Kiểm cả phần cần code backend (hàm sửa của `/chat`, bộ đọc giờ, hash, cache, integration test, eval, tài liệu):

```bash
uv run --frozen --project /path/to/journie-be python tests/backend/check_backend.py --repo /path/to/journie-be
```

Tuỳ chọn:
- `--only R1,T5`: chỉ chạy các mục này.
- `--embed-budget N`: số request được tốn lượt embedding Gemini. Mặc định đủ cho một lượt chạy đầy đủ (khoảng 9 request); `0` thì không tốn lượt nào.
- `--json FILE`: ghi kết quả ra file.

Script không bao giờ gọi `/chat` và không ghi gì vào repo backend.

Bộ test có cả các mục N1-N21 (mỗi mục một hàm `check_N…`, cùng cách làm). Kết quả trên `7395b66` khi chạy kèm `--repo`, hạn mức embedding 0: 30 PASS (35 lỗi cũ đã sửa, trừ các mục cần lượt embedding), 18 FAIL (R7 và các mục N), 9 SKIP vì cần lượt embedding. Lần chạy có lượt embedding riêng cho N10, N14, N16, N17 cũng ra FAIL. Mặc định `--embed-budget` là 26 lượt, đủ cho một lượt chạy đầy đủ.
