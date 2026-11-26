# Spec: Chuyển động tham khảo từ MotionSites cho landing và frontend

Trạng thái: **A và B đã làm và được giữ (2026-11-26).** C chưa làm.
Ngày: 2026-11-26

Đã mở 3 mẫu miễn phí, nên tài khoản MotionSites đã hết lượt mở. Nội dung các mẫu chỉ dùng để tham khảo. Journie **không** lấy video, ảnh, font hay đường dẫn của MotionSites: ảnh vẫn là ảnh thật (Commons, ghi nguồn), tranh vẽ là của Journie, chuyển động làm bằng thư viện `motion` đang có, không thêm thư viện.

## 1. Mỗi mẫu có gì

| Mẫu | Chuyển động thật sự có | Dùng cho Journie |
|---|---|---|
| **Halden Stories** (bản đồ kể chuyện) | (1) Đường bản đồ nét mực **tự vẽ ra** khi tải trang. (2) Rê chuột lên một vùng thì **vùng đó lấp đầy bằng ảnh động**; vòng tròn đánh dấu, mục trong danh sách và toạ độ chạy theo. (3) Bấm vào vùng thì bản đồ **trượt sang trái** (1,25 giây, nhanh ở giữa, chậm hai đầu), lớp câu chuyện trượt vào từ bên phải, có thanh thẻ kéo ngang bằng tay và tự bắt vào thẻ gần nhất. (4) Trên điện thoại, các vùng thành một hàng nhãn cuộn tới mục đang chọn. | **Rất hợp.** Journie đã có sẵn toạ độ cho 6 điểm đến và 4 thành phố, có chữ toạ độ ở hero, có tranh vẽ và poster. |
| **Heritage Grove** (footer) | (1) Nền là tranh mực **chuyển động nhẹ** (hạc bay, sương), đặt sát chữ, không phủ lớp mờ. (2) Các cột **lần lượt nổi lên**: dịch 14px, 0,72 giây, cách nhau 0,08 giây. (3) Khi giảm chuyển động thì hiện ảnh tĩnh. (4) Trên điện thoại, tranh nằm dưới chữ để không đè lên chữ. | **Hợp.** Footer Journie hiện là chữ trên nền phẳng, trong khi app đã có tranh vẽ của 9 cảnh. |
| **AI Trip Planner** (Wandor) | Gần như không có chuyển động riêng. Chỉ có video nền lặp (cảnh do AI tạo), một khung nhập "kính mờ" (nền trắng 6%, viền trắng 3px, làm mờ phía sau 20px), và nút thu nhỏ còn 95% khi bấm. | **Ít giá trị.** Video không phải ảnh thật nên không dùng được. Journie đã có hiệu ứng nhấn nút, chỉ còn khung kính mờ là có thể mượn. |

## 2. Đề xuất

### A. Phần Khám phá trên landing thành "Bản đồ hành trình" (theo Halden Stories)

Thay khung chọn 6 điểm đến hiện tại (`sections/Explore.tsx`). Nội dung và dữ liệu giữ nguyên (`HERO_PLACES`: ảnh, poster, tranh, toạ độ, ghi chú).

- **Bản đồ Việt Nam vẽ bằng nét mực mảnh** trên nền kem, kèm Hoàng Sa và Trường Sa. Nét bản đồ tự vẽ ra khi phần này cuộn vào màn hình, dùng cùng cách vẽ đường như màn chữ Journie.
- **Ghim** cho 6 điểm đến và 4 thành phố, đặt đúng toạ độ. Rê chuột lên hoặc dùng bàn phím chọn một ghim thì:
  - một vòng tròn quanh ghim mở rộng và hiện ảnh thật của nơi đó, ảnh trôi chậm bên trong vòng;
  - vòng đánh dấu nhấp một nhịp, danh sách bên phải tô màu mục đang chọn, dòng toạ độ đổi theo (dùng `formatCoords` đang có).
- **Bấm vào ghim** thì bản đồ trượt sang trái và tấm thẻ của nơi đó trượt vào: poster, ghi chú, nhiệt độ, nút "Lên lịch ở đây" dẫn tới `/login` hoặc `/app/plan`. Có nút "‹ Bản đồ" để quay lại. Kéo ngang để sang nơi kế tiếp, thẻ tự bắt vào chỗ.
- **Trên điện thoại:** bản đồ thu nhỏ vừa màn hình, bên dưới là hàng nhãn cuộn tới mục đang chọn, tấm thẻ hiện ở dưới bản đồ.
- **Giảm chuyển động:** không vẽ nét, không trượt, đổi ngay lập tức. Ảnh chỉ tải khi sắp tới; vòng ảnh dùng `clip-path`, không dùng video.

**Cần bạn cho phép một việc:** để bản đồ đúng địa lý, cần tải dữ liệu biên giới Natural Earth (miền công cộng, file khoảng vài MB) vào thư mục tạm. Từ đó mình làm ra **một** đường SVG đã giản lược, dưới 20 KB, lưu trong `src/assets`. App không thêm thư viện nào, và file dữ liệu gốc không vào repo.

### B. Footer có tranh vẽ chuyển động nhẹ (theo Heritage Grove)

- Phần dưới footer là tranh vẽ của cảnh đang dùng (`DrawnBackdrop`, đổi theo ảnh như nền app). Chữ đặt sát tranh, không phủ lớp mờ.
- **Chuyển động rất nhẹ, chỉ dùng tranh có sẵn:**
  - chim (đã có `Birds`) bay chéo qua;
  - các nét mặt nước trôi qua lại 6–10px, mỗi vòng khoảng 8 giây;
  - sương nhạt dần ở mép trên.
  - Chỉ chạy khi footer đang trên màn hình.
- Các cột chữ lần lượt nổi lên khi cuộn tới (14px, 0,72 giây, cách nhau 0,08 giây).
- **Trên điện thoại:** tranh nằm dưới các cột chữ. **Giảm chuyển động:** tranh đứng yên.

### C. Khung nhập "kính mờ" (theo AI Trip Planner), tuỳ chọn

Ô "Muốn đi đâu" ở bảng điều khiển và trang Tạo lịch trình làm nền kính mờ trên tranh vẽ: nền trắng khoảng 6–10%, làm mờ phía sau 20px, viền sáng. Bản tối dùng màu nền ban đêm của cảnh. Thay đổi nhỏ, không có chuyển động mới.

## 3. Không lấy

- Video, ảnh, poster và font của MotionSites, cùng mọi đường dẫn tới máy chủ của họ.
- Bố cục "hero một màn hình" của Wandor: Journie đã có hero riêng.
- Thẻ câu chuyện màu nổi kiểu Halden: dùng poster và màu theo cảnh của Journie thay vào.

## 4. Kiểm tra khi làm

- Bản đồ khớp toạ độ: mỗi ghim nằm trong 2px so với vị trí tính từ kinh độ, vĩ độ. Có Hoàng Sa và Trường Sa.
- Bàn phím: Tab qua các ghim, Enter để mở, Esc để quay lại. Trình đọc màn hình đọc được tên và ghi chú.
- Ở bề ngang 375, 768, 1024 và 1440px không có thanh cuộn ngang, và tranh footer không đè lên chữ.
- Cuộn vẫn mượt. Ảnh chỉ tải khi gần tới.
- Bật giảm chuyển động thì không còn gì chạy.

## 5. Câu hỏi cho bạn

1. Làm phần nào: **A**, **B**, **C**, hay kết hợp? Đề xuất: **A và B**.
2. Cho phép tải dữ liệu Natural Earth (miền công cộng) để vẽ bản đồ ở phần A không?

## 6. Đã làm

- **A:** `sections/Explore.tsx` dùng `content/vietnamMap.ts`. Đây là đường viền Việt Nam lấy từ Natural Earth 1:50m (miền công cộng), giản lược còn 411 điểm, chưa tới 5 KB, kèm hàm `mapPoint` để đặt toạ độ lên bản đồ. Hoàng Sa và Trường Sa vẽ thành các chấm.
  - Có 9 điểm: 6 điểm đến cũ cộng Hà Nội, Huế, Đà Nẵng. Nút "Lên lịch ở …" chỉ hiện với 4 thành phố lên lịch được.
  - Tiêu đề và mô tả của phần Khám phá được viết lại cho khớp.
- **B:** `components/Footer.tsx` có thêm `FooterLandscape`: tranh ban đêm của nơi hero đang hiện, sương trôi, chim bay. Các cột chữ nổi lên trong 0,72 giây, cách nhau 0,08 giây.
  - Nét mặt nước không cho động riêng được vì tranh là ảnh SVG gộp, nên thay bằng lớp sương trôi.
