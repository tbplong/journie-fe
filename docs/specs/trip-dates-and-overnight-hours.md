# Spec: Ngày đi – ngày về, và khung giờ qua nửa đêm

Trạng thái: **bản nháp, chờ duyệt.** Chưa sửa code.
Ngày: 2026-11-25

Bạn hỏi ba việc:
1. Lữ khách chọn ngày đi và ngày về, app tự tính số ngày.
2. Khách muốn đi từ 9 giờ sáng hôm nay đến 3 giờ sáng hôm sau thì app xử lý thế nào.
3. Phần routing đã thật sự tối ưu chưa.

Phần 1 và 2 là tính năng mới, chờ bạn duyệt. Phần 3 là đánh giá kèm đề xuất cải thiện, cũng chờ duyệt.

## 1. Chọn ngày đi và ngày về

### Hiện tại

- Form tạo chuyến (`src/pages/app/PlanPage.tsx`) có **Ngày khởi hành** và nút **±** cho **Số ngày**, tối đa 7 ngày.
- Từ khung câu chữ, Gemini đọc được `start_date`, `end_date` và `duration_days`. `daysFromExtraction` ưu tiên số ngày, sau đó mới tính từ hai ngày.

### Đề xuất

- **Bỏ nút ± số ngày.** Thay bằng hai ô: **Ngày đi** (`start-date`) và **Ngày về** (`end-date`), cùng kiểu ô ngày đang dùng.
- **Số ngày = ngày về − ngày đi + 1.** Hiện bên cạnh dạng chỉ đọc, ví dụ "3 ngày 2 đêm", tiếng Anh "3 days, 2 nights".
- **Kiểm tra dữ liệu:**
  - Ngày đi không sớm hơn hôm nay, như hiện tại.
  - Ngày về không sớm hơn ngày đi.
  - Tối đa 7 ngày (`MAX_TRIP_DAYS`). Ô ngày về đặt sẵn `min` và `max` theo ngày đi, nên không chọn được ngày sai.
- **Khi đổi ngày đi:** giữ nguyên số ngày đang có và dời ngày về theo. Ví dụ chọn ngày đi mới, ngày về tự lùi theo cho đủ số ngày.
- **Form và câu chữ:**
  - Ngày lữ khách đã tự chọn ở form thắng ngày viết trong câu, như cơ chế `touched` hiện có.
  - Ngày chưa chọn thì lấy theo câu. Ví dụ câu viết "từ 5 đến 7/12" thì cả hai ô được điền theo.
  - `applyForm` gửi cả `start_date` và `end_date`, rồi tính `duration_days` từ hai ngày đó.
- **Trang chuyến (khung chỉnh sửa):** thêm hai ô ngày tương tự, cạnh "Khung giờ mỗi ngày".
  - Đổi ngày về làm chuyến dài thêm hoặc ngắn lại, đi qua `adjustItinerary` giống "thêm 1 ngày".
  - Đổi ngày đi thì dời cả chuyến.
- **Không đổi kiến trúc:** không thêm trường lưu trữ nào. `startDate` và số ngày đã có trong `Trip`, ngày về luôn tính ra từ hai giá trị đó.

## 2. Khung giờ qua nửa đêm (ví dụ 09:00 đến 03:00 hôm sau)

### Hiện tại

Hiện app không hỗ trợ khung giờ này:

- **Form:** giờ kết thúc sớm hơn giờ bắt đầu bị coi là mâu thuẫn (`time_order`). App giữ khung mặc định 08:00–21:00 và hiện ghi chú.
- **Khung chỉnh sửa:** `adjustItinerary` báo lỗi `day-window` ("ngày kết thúc trước khi bắt đầu").
- **Backend** (`app/schemas/routing.py:81`) từ chối `day_end <= day_start`. Ngày d chỉ chạy từ `d·24h + day_start` đến `d·24h + day_end` (`app/services/routing/service.py:70-78`).

Giờ mở cửa qua nửa đêm thì cả hai bên đã đọc đúng. Ví dụ quán bar mở 18:00–02:00:
- Frontend lưu thành 1080–1560 phút (`src/domain/openingHours.ts:38`).
- Backend tính giờ theo trục thời gian của cả tuần.

Vì vậy chỉ cần nới khung giờ của ngày đi, không phải sửa phần giờ mở cửa.

### Đề xuất

- **Cách hiểu:** giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu nghĩa là **sang hôm sau**. Ví dụ 09:00–03:00 là 18 tiếng.
  - Giao diện ghi rõ: "03:00 (hôm sau)", tiếng Anh "03:00 (next day)".
- **Giới hạn**, các con số chờ bạn chốt:
  - Giờ kết thúc hôm sau muộn nhất là 05:00.
  - Một ngày đi dài tối đa 20 tiếng.
  - Ngày sau bắt đầu ít nhất 6 tiếng sau giờ kết thúc ngày trước. Ví dụ ngày 1 kết thúc 03:00 thì ngày 2 bắt đầu sớm nhất 09:00. Nếu khách chọn sớm hơn, app dời ngày 2 cho đủ 6 tiếng và báo rõ.
- **Câu chữ:** "đi từ 9h tới 3h sáng hôm sau", "chơi tới khuya 2h", "until 3am" được đọc là khung qua đêm, không bị coi là mâu thuẫn.
  - Luật nằm ở `intentFromExtraction` (chỗ kiểm tra `inverted`) và ở `withHours` của phần chỉnh sửa.
  - Chỉ hiểu là qua đêm khi câu có chữ chỉ hôm sau hoặc ban đêm ("sáng hôm sau", "hôm sau", "khuya", "đêm", "am"). Câu như "9h đến 3h" không kèm chữ nào như vậy thì vẫn hỏi lại như hiện tại.
- **Thay đổi ở frontend:**
  - `dayEnd` được phép lớn hơn 1440 phút. Ví dụ 03:00 hôm sau là 1620 phút.
  - Bộ giải ngày (`visitSlot`, `windowsOn`) phải xét thêm giờ mở của **thứ hôm sau**, cộng 1440. Nếu không, quán mở 24/7 hay quán phở mở 05:00 sẽ bị coi là đóng sau nửa đêm.
  - Bữa ăn khuya được tính là một bữa. Luật "quán bar từ 18:00" giữ nguyên.
  - Mọi chỗ hiển thị giờ (`fmtTime`, `Timeline`, `LivePage`, thẻ chuyến ở Dashboard) ghi "(hôm sau)" khi giờ vượt 24:00. `LivePage` tính tiến độ trong ngày theo khung giờ mới.
- **Thay đổi ở backend:**
  - `schemas/routing.py`: chấp nhận `day_end <= day_start` và hiểu là hôm sau, kèm hai giới hạn ở trên (20 tiếng, nghỉ 6 tiếng).
  - `service.py`: tính giờ kết thúc ngày d bằng cách cộng thêm 24 tiếng khi qua đêm.
  - Hai ngày liên tiếp không được chồng lên nhau.
  - Ghi cách hiểu mới vào `docs/API.md`.
- **Không đổi kiến trúc:** cùng các trường cũ (`dayStart`, `dayEnd`, `day_start`, `day_end`), chỉ mở rộng cách hiểu.
- **Rủi ro cần nói rõ với lữ khách:**
  - Sau 22:00 rất ít điểm mở cửa, chủ yếu là bar, chợ đêm và quán ăn khuya. App sẽ không lấp giờ khuya bằng điểm tham quan đã đóng.
  - Đi lại sau nửa đêm nên dùng taxi. Nếu khách chọn đi bộ, app hiện ghi chú.

## 3. Routing đã tối ưu chưa

### Cách app xếp lịch hiện nay

1. **Lập lịch:** app chọn địa điểm và chia ngày sơ bộ trên máy (`planTrip`).
2. **Gợi ý lại:** nút này gửi bản nháp cho backend (`POST /routing/days`). Backend chia lại các ngày và sắp thứ tự từng ngày.
3. **Xếp lịch:** nút này gửi cho backend (`POST /routing`). Backend sắp thứ tự lần cuối và tính giờ đến từng điểm theo đường đi thật.

Bạn thấy đúng: "Xếp lịch" chính là bước routing. Bước 2 chỉ là chạy routing thêm một lần ở dạng nháp.

### Phần đã tối ưu

- **Thứ tự trong một ngày (tối đa 9 điểm):** backend tìm vét cạn, có cắt nhánh (`exact_order`, `best_order`, `polish` trong `ils.py`). Thứ tự được chọn là thứ tự tốt nhất **theo tiêu chí của app**, không phải đoán.
- **Tiêu chí, xét theo thứ tự ưu tiên:**
  1. Không phạm luật: giờ mở cửa, bữa ăn đúng giờ, quán bar từ 18:00, đa dạng loại điểm.
  2. Cân bằng giữa các ngày.
  3. Ít thời gian mất nhất, gồm di chuyển, thời gian chờ và phần phạt của các luật mềm.

  Như vậy **quãng đường ngắn nhất không phải tiêu chí số một**. Khi giờ ăn hay giờ mở cửa buộc phải đi vòng, app chọn đúng giờ trước, ngắn đường sau.

### Phần chưa tối ưu

- **Chia điểm cho các ngày** dùng thuật toán heuristic (ILS, có giới hạn thời gian). Kết quả tốt nhưng không có gì chứng minh là tối ưu nhất.
- **Đi vòng:** đợt test vừa rồi thấy khoảng 13 ngày trên 96 chuyến có quãng đường dài hơn hẳn thứ tự ngắn nhất của cùng các điểm. Ví dụ một ngày ở Đà Nẵng đi 14,2 km, trong khi thứ tự ngắn nhất là 7,0 km. Một phần là do giờ ăn và giờ mở cửa buộc phải đi vòng; chưa đo phần còn lại.
- **Buổi chiều trống dài:** 11/17 ngày có khoảng trống hơn 90 phút.
  - Phần lớn là do hai luật cố ý trong `rules.yaml`: nghỉ trưa tối đa 180 phút (`midday_rest`), và chờ tới bữa tối hoặc giờ ra quán bar tối đa 180 phút (`evening.free_minutes`).
  - Ngày 6 điểm chỉ lấp khoảng 7 trong 13 tiếng.

### Đề xuất cải thiện (chỉ đổi luật và code, không đổi kiến trúc)

1. **Đo trước khi sửa:** viết một bộ đo trên khoảng 200 chuyến ở 4 thành phố.
   - Với mỗi ngày, so quãng đường thật với thứ tự ngắn nhất **thỏa cùng các luật**, tách riêng phần đi vòng do luật và phần đi vòng thật sự thừa.
   - Đếm các khoảng trống trên 90 phút.
2. **Bớt đi vòng thừa:** sau khi chọn thứ tự đúng luật, nếu còn thứ tự khác cũng đúng luật mà ngắn hơn ít nhất 20%, chọn thứ tự đó, kể cả khi tổng thời gian mất ngang nhau.
3. **Lấp khoảng trống:** khi một ngày còn trống hơn 90 phút mà gần đó có điểm đang mở và hợp sở thích, cho bộ xếp lịch thêm một điểm. Đồng thời giảm `midday_rest.max_minutes` xuống 90 cho các ngày ít điểm. Con số này chờ bạn chốt.
4. **Báo trước khi chưa tối ưu:** nếu backend hết thời gian tìm trước khi xét xong, ghi chú nhỏ "Lịch được xếp nhanh, bấm Xếp lại để tìm kỹ hơn".

## 4. Kiểm thử khi làm

- **Ngày đi – ngày về:** các ca biên.
  - Một ngày (đi và về cùng ngày); 7 ngày; ngày về trước ngày đi (không chọn được); đổi ngày đi thì ngày về dời theo.
  - Câu chữ có ngày và form cũng có ngày, xem bên nào thắng.
  - Tiếng Anh.
- **Qua đêm:**
  - Các khung 09:00–03:00, 18:00–02:00, 20:00–04:00, và 06:00–05:00 (vượt 20 tiếng, phải báo lỗi).
  - Quán bar mở tới 02:00, quán mở 24/7, quán phở mở 05:00.
  - Chuyến nhiều ngày với khung qua đêm, xem ngày sau có đủ 6 tiếng nghỉ không.
  - Chạy đủ ba bước: lập lịch, "Gợi ý lại" và "Xếp lịch".
  - Các bộ test hiện có phải giữ nguyên: `verify.mjs` 192/192, giữ điểm cũ 79/79, bộ test chỉnh sửa, và test unit và integration của backend.
- **Routing:** bộ đo ở mục 3 chạy trước và sau, báo số liệu.

## 5. Cần bạn chốt

1. Giờ kết thúc hôm sau muộn nhất: 05:00?
2. Ngày đi dài tối đa 20 tiếng, và nghỉ tối thiểu 6 tiếng giữa hai ngày?
3. Có làm các đề xuất routing ở mục 3 không, và nghỉ trưa tối đa 90 phút có ổn không?
4. Làm ngay, hay chờ hạn mức tuần reset (06:00 sáng 30/11)? Hạn mức tuần hiện đã 71%, cao hơn mức 60% bạn đặt.
