# Spec: Thanh điều hướng trên cùng và hình vẽ chìm làm nền

Trạng thái: **đã duyệt 2026-11-25, đã làm** thanh trên cùng, hình vẽ chìm trong app, trang chủ và trang đăng nhập. 3 hình Hà Nội, Đà Nẵng, Huế đã duyệt và đưa vào ngày 2026-11-25.
Ngày: 2026-11-25

## 1. Yêu cầu

> "deign task bar lên trên đầu cho bản web, còn phần ảnh minh họa vẽ lại đưa chìm xuống nền của web chính, ý tôi là vậy"

Cách hiểu dưới đây đã được đối chiếu lại với code.

| Cụm từ | Cách hiểu chọn | Lý do |
|---|---|---|
| task bar | Thanh điều hướng của app sau khi đăng nhập (hiện là cột bên trái) | Trang chủ đã có thanh ở trên rồi. |
| lên trên đầu, bản web | Trên máy tính (từ 1024px), cột trái đổi thành thanh ngang trên cùng. Điện thoại giữ nguyên. | Điện thoại đã có header ở trên và thanh tab ở dưới. |
| ảnh minh họa vẽ lại | Nửa dưới của poster: các hình khối vẽ lại từ ảnh thật | Đúng với prompt ban đầu: ảnh thật được vẽ lại thành hệ ký hiệu. |
| đưa chìm xuống nền, web chính | Hình vẽ trải mờ phía sau nội dung app, không đóng khung | Tin đầu tiên nói "chỉnh nền của journie". |
| ý tôi là vậy | Cách treo nguyên tấm poster có khung ở trang chủ và thẻ đăng nhập chưa đúng ý | |

## 2. Thanh trên cùng (máy tính, từ 1024px)

**Kích thước và hành vi khi cuộn**
- Cao 64px, dính ở đỉnh, nội dung canh theo cùng bề rộng với phần nội dung trang.
- Cột trái và khoảng lề trái 17.5rem được bỏ.
- Ở đầu trang thanh gần trong suốt. Cuộn xuống thì thanh có nền giấy mờ, hơi nhòe và viền dưới; ban đêm dùng nền xanh đêm.
- Thanh không tự ẩn khi cuộn.

**Bố cục**
- **Trái:** logo.
- **Giữa:** 5 mục chính: Trang chủ, Tạo lịch trình, Chuyến đi, Khám phá, Gợi ý địa điểm.
- **Phải:** chip chuyến đang đi (nếu có), thời tiết dạng gọn, đổi ngôn ngữ, chuông, avatar.
- **Menu avatar:** Bộ sưu tập, Hồ sơ & sở thích, Tài khoản, Đăng xuất. Mọi trang cũ vẫn tới được trong tối đa 2 lần bấm.
- **Tài khoản doanh nghiệp** (dùng chung khung app): 3 mục Bảng điều khiển, Nhân viên, Dữ liệu điểm đến nằm ở giữa; Tài khoản vào menu avatar.

**Trạng thái**
- **Mục đang mở:** chữ đậm, có gạch vàng 2px bên dưới, gạch trượt sang mục mới khi chuyển trang. Không dùng nền hộp.
- **Từ 1024 đến 1279px:** 5 mục chỉ còn icon, có tooltip và nhãn cho trình đọc màn hình. Từ 1280px hiện đủ chữ, cả tiếng Việt và tiếng Anh.

**Giữ nguyên**
- Điện thoại và máy tính bảng dưới 1024px: giữ nguyên header và thanh tab dưới.
- Trang admin: giữ nguyên cột trái, vì đó là màn làm việc nhiều mục.

**Chỗ phải chỉnh theo:** 3 thanh dính trong trang phải lùi xuống dưới thanh mới.
- `src/pages/app/ProfilePage.tsx:232`
- `src/pages/app/PlanPage.tsx:610`
- `src/pages/app/TripsPage.tsx:123`

## 3. Hình vẽ chìm làm nền

**Ảnh dùng làm nền**
- Chỉ lấy vùng hình khối của poster. Không có tên, tọa độ, chú giải, bảng màu hay dòng ghi nguồn, để nền không tranh chữ với giao diện.
- Mỗi điểm có 2 bản xuất từ khuôn dựng poster:
  - **Bản ngày:** nét màu trên nền trong suốt.
  - **Bản đêm:** cùng hình nhưng màu sáng hơn.
- Mỗi ảnh dưới 120KB. Không cắt từ file poster 500KB.

**Vị trí và cách làm chìm**
- Một lớp cố định phía sau mọi trang app, neo ở đáy màn hình, cao khoảng 45% màn hình, không cuộn theo nội dung.
- Ban ngày hòa vào giấy, độ đậm khoảng 16–20%. Ban đêm khoảng 10–14%.
- Mép trên và hai bên tan dần. Không làm nhòe, để giữ nét in sắc.
- Chữ đặt thẳng lên nền chỉ ở nửa trên màn hình, nơi hình đã tan hết. Các panel giữ nền đặc như hiện tại.

**Chọn hình nào**
- Trong app: hình của thành phố đang chọn. Đổi thành phố thì hình tan sang hình mới trong 1,2 giây.
- Hình không tự đổi theo thời gian, vì nền chuyển động dễ làm phân tâm.
- Hiện chỉ Sài Gòn có hình vẽ. **Đề xuất vẽ thêm 3 hình cho Hà Nội (Tháp Rùa), Đà Nẵng (Cầu Rồng), Huế (Ngọ Môn)** từ ảnh bìa đang dùng, theo cùng khuôn với 6 poster.
- Trang chủ và trang đăng nhập: dùng hình của điểm đến được chọn ngẫu nhiên mỗi lượt như hiện nay.

**Các lớp đang có**
- Giữ mưa, mây, mặt trời và mặt trăng nằm trên hình vẽ.
- Hai vệt màu ở góc nền app giảm còn một nửa.

## 4. Trang chủ và trang đăng nhập

- **Trang chủ:**
  - Cột phải trở lại chỉ hiện ảnh thật (ảnh bìa đã thay bản nét hơn), không còn nửa hình vẽ.
  - Hình vẽ chìm thay cảnh núi vẽ tay ở đáy phần đầu trang.
- **Đăng nhập:**
  - Nửa trái của thẻ chỉ hiện ảnh thật, Di đứng trên ảnh.
  - Hình vẽ chuyển xuống nền phía sau thẻ, thay cảnh núi vẽ tay.
- **Giữ nguyên:** màn chờ lên lịch (trình chiếu ảnh thật).
- Các file poster nguyên tấm vẫn giữ trong repo để dùng sau, nhưng không còn hiện ở đâu.

## 5. Hiệu năng và trợ năng

- Ảnh nền là ảnh trang trí: không có mô tả, trình đọc màn hình bỏ qua. Mỗi lần tải trang chỉ tải 1 ảnh nền.
- Khi máy bật giảm chuyển động: hình đổi tức thì, không tan dần; gạch dưới mục không trượt.
- Chữ đạt tương phản AA (4.5:1) cả ngày lẫn đêm.
- Thanh trên là vùng điều hướng có nhãn, giữ link "Bỏ qua điều hướng". Menu avatar dùng được bằng bàn phím và đóng bằng Esc.
- Không thêm thư viện, endpoint hay luồng dữ liệu. Chỉ đổi bố cục giao diện.

## 6. Ba quyết định cần bạn chọn (mỗi mục có mặc định)

1. **"Web chính" gồm những trang nào?** Mặc định: app sau đăng nhập, rồi trang chủ và trang đăng nhập theo cùng cách.
2. **Gom Bộ sưu tập, Hồ sơ & sở thích, Tài khoản vào menu avatar?** Mặc định: có.
3. **Vẽ thêm 3 hình cho Hà Nội, Đà Nẵng, Huế, gửi bạn duyệt trước rồi mới đưa vào?** Mặc định: có.

## 7. Nghiệm thu

- Từ 1024px không còn cột trái. Thanh trên dính khi cuộn và không xuống dòng hay tràn ở 1024, 1280 và 1440px, cả tiếng Việt lẫn tiếng Anh.
- Dưới 1024px giao diện giống hệt hiện tại. Trang admin không đổi.
- Hình vẽ chìm hiện ở mọi trang app, cả ngày lẫn đêm, và không có chữ nào của poster lọt vào nền.
- Không có chữ giao diện nào nằm đè lên vùng hình đậm. Tương phản đạt AA.
- Bật giảm chuyển động thì nền và thanh đứng yên.
- Mỗi trang chỉ tải thêm 1 ảnh nền, dưới 120KB.
