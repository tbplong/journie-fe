# Spec: Thời gian nên dành tại một địa điểm

Trạng thái: **đã duyệt ("làm hết như spec") và đã làm** phần code và file cấu hình. Phần ghi vào DB đang chờ bạn đồng ý (mục 6).
Ngày: 2026-11-25

## 1. Hiện trạng

### 1.1. Ba bộ số khác nhau

| Loại | Backend `visit_minutes.yaml` (v1) | Frontend `poiFromCard.ts` | journie-data `duration.v1.yaml` |
|---|---|---|---|
| Nhà hàng | 60 | 75 | 75 |
| Quán cà phê | 45 | 60 | 60 |
| Bảo tàng | 90 | 120 | 120 |
| Phòng trưng bày | 60 | 90 | 90 |
| Công trình nổi bật (landmark) | 45 | 60 | 60 |
| Di tích (historic_site) | 45 | 75 | 75 |
| Công viên | 45 | 90 | 90 |
| Vườn | 45 | 75 | 75 |
| Chợ | 60 | 90 | 90 |
| Trung tâm thương mại | 90 | 120 | 120 |
| Chùa, đền | 40 | 45 | 45 |
| Nhà thờ | 30 | 45 | 45 |
| Công viên giải trí | 180 | **60** (không có trong bảng, rơi vào mặc định) | — |
| Cửa hàng bách hoá | 60 | **60** (mặc định) | — |

- **Backend** dùng bảng của nó khi xếp giờ, nên giờ hiện trên lịch là số của backend.
- **Frontend** dùng bảng riêng khi máy tự chọn điểm cho từng ngày, khi bạn sửa lịch và khi đổi lịch giữa chuyến. Vì vậy máy chọn số điểm theo một bộ số, rồi backend xếp giờ theo bộ số khác. Lệch lớn nhất là công viên giải trí: máy tính 60 phút, backend tính 180 phút, nên ngày đó dễ bị quá giờ và mất điểm.
- **journie-data** không được dùng lúc chạy. Cột `expected_visit_duration_min` trong dữ liệu đang trống ở cả 925 điểm của TP.HCM.
- Tài liệu cơ sở `journie-be/docs/visit-duration-basis.md` (mục 3.1) đã chọn số của backend, vì ở hai loại có số đo thật (nhà hàng, trung tâm thương mại), bằng chứng nghiêng về số của backend. Tài liệu cũng đề nghị chỉ giữ một nguồn số.

### 1.2. Mỗi loại chỉ có một con số

Mọi điểm cùng loại nhận cùng một thời gian, kể cả khi khác nhau rất xa:

| Địa điểm | Loại trong dữ liệu | Đang tính |
|---|---|---|
| Thảo Cầm Viên (vườn thú và vườn bách thảo) | nature.garden | 45 phút |
| Cầu Vàng (chỉ đến được trong khu Bà Nà Hills) | attraction.landmark | 45 phút |
| Dinh Độc Lập | attraction.landmark | 45 phút |
| Bảo tàng Dân tộc học Việt Nam | attraction.museum | 90 phút |
| Một quán phở hay bún bò | food.restaurant | 60 phút |
| Nhà hàng có sao Michelin | food.restaurant | 60 phút |

Các hệ số trong tài liệu cơ sở (mục 2.3 và 2.4: kiểu quán, độ nổi tiếng, diện tích, nhịp độ, số người...) **chưa được làm**. File yaml chỉ có bảng theo loại.

### 1.3. Thiếu điểm lớn ở Huế và Đà Nẵng (ngoài phạm vi spec này)

Huế chỉ có 12 điểm tham quan và không có Đại Nội, chùa Thiên Mụ hay các lăng. Đà Nẵng chỉ có 10 điểm và không có Ngũ Hành Sơn hay chùa Linh Ứng. Đây là việc của pipeline Journie-Data, cần một đợt riêng nếu bạn muốn.

## 2. Đề xuất

### 2.1. Chỉ giữ một nguồn số

- Backend tính thời gian cho từng nơi bằng một hàm duy nhất. Hàm này dùng cho việc xếp giờ, và kết quả được gửi kèm thẻ địa điểm thành trường mới `visit_minutes`. Thẻ được tạo ở hai chỗ: `sections.to_card` và `service.name_card`.
- Frontend (`poiFromCard`) dùng `card.visit_minutes`. Chỉ khi thiếu trường này (dữ liệu dự phòng trên máy) mới dùng bảng theo loại, và bảng đó được chép đúng theo số của backend, thêm các loại còn thiếu (công viên giải trí, vườn thú, cửa hàng bách hoá, ăn vặt).
- Cách này không thêm dịch vụ hay endpoint mới, chỉ thêm một trường vào phản hồi đã có.

### 2.2. Số riêng cho 28 điểm có nguồn

Cách làm:
- Tra cứu 138 điểm dễ lệch nhất: bảo tàng, di tích, công trình nổi bật, công viên, chợ, nhà hát, công viên giải trí, cùng các chùa và đền hạng A, B.
- Quy tắc nguồn: chỉ nhận số từ trang chính thức, hoặc ít nhất hai nguồn độc lập. Không dùng Google Maps. Bỏ các trang tự sinh nội dung hoặc không ghi tác giả.
- Hai lượt kiểm tra độc lập: mở lại các nguồn được trích và chấm độ tin cậy.
- 12 điểm hai lượt kiểm tra không đồng ý được xem lại và phân xử.

Kết quả:
- 35 điểm có số. Bỏ 7 điểm chỉ lệch dưới 10 phút so với số chung, còn lại 28 điểm.
- 103 điểm còn lại không có nguồn đủ tin, nên giữ số chung của loại.

Lưu ý về nguồn:
- vietnamtourism.com là trang tin du lịch tư nhân, không phải trang của Tổng cục Du lịch.
- Các số ghi "1 nguồn" đều đã được người kiểm tra chấp nhận và nằm trong khoảng hợp lý của loại đó (bảng 2.2 của tài liệu cơ sở).
- Cầu Vàng và Bảo tàng Dân tộc học có thêm nguồn thứ hai do mình tra lại: [Local Vietnam](https://localvietnam.com/da-nang/golden-bridge-vietnam/) nói Bà Nà cần gần như cả ngày; [Deep Arrival](https://deeparrival.com/destinations/historic/vietnam-museum-ethnology-hanoi-visitor-guide/) nói cần 2–3 giờ.

| Thành phố | Địa điểm | Đang tính | Đề xuất | Căn cứ |
|---|---|---|---|---|
| Đà Nẵng | [Cầu Vàng](https://hoiandaytrip.com/how-long-to-spend-at-golden-bridge-da-nang/) (nguồn nói cả chuyến vào Bà Nà mất 6 giờ) | 45 | **90** (giới hạn 1 giờ 30) | 2 nguồn |
| Đà Nẵng | [Chợ đêm Helio](https://www.nomadotravel.app/vi/attractions/helio-night-market) | 60 | **90** | 1 nguồn, đã phân xử |
| TP.HCM | [Thảo Cầm Viên](https://ca.trip.com/travel-guide/attraction/ho-chi-minh-city/saigon-zoo-and-botanical-garden-10521719) | 45 | **90** (nguồn: 180, giới hạn 1 giờ 30) | 2 nguồn |
| TP.HCM | [Dinh Độc Lập](https://www.klook.com/en-US/activity/130952-independence-palace-ticket-in-ho-chi-minh-city) | 45 | **90** | 2 nguồn |
| TP.HCM | [Bảo tàng Chứng tích Chiến tranh](https://www.nomadotravel.app/en/attractions/war-remnants-museum) | 90 | **90** (nguồn: 120, giới hạn 1 giờ 30) | 2 nguồn |
| TP.HCM | [Chợ Bến Thành](https://www.nomads-travel-guide.com/places/ben-thanh-market) | 60 | **90** | 2 nguồn, đã phân xử |
| TP.HCM | [Rạp xiếc Phú Thọ](https://www.sggp.org.vn/lan-dau-cong-dien-vo-xiec-roi-mo-show-hoanh-trang-dac-sac-post857148.html) (Mơ Show dài 70 phút) | 120 | **85** | người kiểm tra tìm ra, đã phân xử |
| TP.HCM | [Múa rối nước Rồng Vàng](https://localvietnam.com/ho-chi-minh-city/water-puppet-show-in-ho-chi-minh-city/) | 120 | **65** | 2 nguồn |
| TP.HCM | [Bảo tàng FITO](https://localvietnam.com/?p=27785) | 90 | **60** | 1 nguồn, đã phân xử |
| TP.HCM | [Bảo tàng Mỹ thuật TP.HCM](https://www.vietnamairlines.com/en/useful-information/travel-guide/ho-chi-minh-city-museum-of-fine-arts) | 90 | **75** | 2 nguồn |
| TP.HCM | [Bảo tàng TP.HCM](https://www.hoteldesartssaigon.com/?p=19657) | 90 | **75** | 2 nguồn |
| Hà Nội | [Hoàng thành Thăng Long](https://kampatour.com/thang-long-imperial-citadel) | 45 | **90** (nguồn: 120, giới hạn 1 giờ 30) | 2 nguồn |
| Hà Nội | [Bảo tàng Lịch sử Quân sự Việt Nam](https://www.vietnamtourism.com/en/places/hanoi/vietnam-military-history-museum) | 90 | **90** (nguồn: 150, giới hạn 1 giờ 30) | 2 nguồn |
| Hà Nội | [Bảo tàng Dân tộc học Việt Nam](https://www.vietnamtourism.com/en/vietnam-museum-of-ethnology-in-hanoi-tickets-opening-hours-and-what-not-to-miss) | 90 | **90** (nguồn: 150, giới hạn 1 giờ 30) | 2 nguồn |
| Hà Nội | [Bảo tàng Phòng không – Không quân](https://mia.vn/cam-nang-du-lich/bao-tang-phong-khong-khong-quan-13307) | 90 | **90** (nguồn: 150, giới hạn 1 giờ 30) | 1 nguồn |
| Hà Nội | [Bảo tàng Phụ nữ Việt Nam](https://www.vietnamtourism.com/en/places/hanoi/vietnamese-womens-museum) | 90 | **90** (nguồn: 105, giới hạn 1 giờ 30) | 1 nguồn |
| Hà Nội | [Bảo tàng Mỹ thuật Việt Nam](https://localvietnam.com/hanoi/vietnam-fine-arts-museum-hanoi/) | 90 | **75** | 2 nguồn |
| Hà Nội | [Chợ Đồng Xuân](https://www.vietnamtourism.com/en/dong-xuan-market-in-hanoi-the-complete-guide-to-the-old-quarter-s-landmark-bazaar) | 60 | **90** | 2 nguồn |
| Hà Nội | [Lăng Chủ tịch Hồ Chí Minh](https://www.vietnamtourism.com/en/ho-chi-minh-mausoleum-opening-hours-free-entry-and-the-dress-code) (gồm xếp hàng) | 45 | **60** | 1 nguồn |
| Hà Nội | [Binh Minh Jazz Club](https://minhjazzvietnam.com/contact-us/) | 120 | **90** (nguồn: 150, giới hạn 1 giờ 30) | chính thức |
| Hà Nội | [Nhà hát Lớn Hà Nội](https://www.vietnamtourism.com/en/hanoi-opera-house-tours-tickets-and-how-to-see-a-performance) | 120 | **70** | 2 nguồn |
| Hà Nội | [Múa rối nước Thăng Long](https://www.klook.com/activity/35653-thang-long-water-puppet-show-ticket-hanoi/) | 120 | **65** | 2 nguồn |
| Hà Nội | [Cột cờ Hà Nội](https://vietnamtravel.com/hanoi-flag-tower) | 45 | **35** | 2 nguồn |
| Hà Nội | [Nhà cổ 87 Mã Mây](https://www.vietnamtourism.com/en/places/hanoi/heritage-house-87-ma-may) | 45 | **30** | 1 nguồn |
| Hà Nội | [Đền Bạch Mã](https://www.vietnamtourism.com/en/places/hanoi/bach-ma-temple) | 40 | **25** | 2 nguồn |
| Huế | [Làng hương Thủy Xuân](https://www.vietnamtourism.com/vi/lang-huong-hue-thuy-xuan-cach-tham-quan-nhung-gi-mong-oi) | 45 | **70** | 1 nguồn |
| Huế | [Cung An Định](https://www.vietnamtourism.com/vi/cung-an-dinh-o-hue-lich-su-diem-tham-quan-va-cach-di-lai) | 45 | **65** | 1 nguồn |
| Huế | [Phu Văn Lâu](https://localvietnam.com/hue/phu-van-lau/) | 45 | **30** | 1 nguồn |

Số riêng được ghi vào `visit_minutes.yaml` thành một khối `places:` (id → phút), mỗi dòng kèm chú thích nguồn. Đây là thêm luật, không đổi kiến trúc. Bảng đầy đủ, cả 138 điểm và nguồn của từng điểm, nằm ở [visit-durations-research.json](visit-durations-research.json).

### 2.3. Quán ăn theo kiểu món

Mọi nhà hàng đang được tính 60 phút. Tài liệu cơ sở (mục 2.3) đã đề xuất hệ số theo kiểu phục vụ, nhưng chưa làm. Đề xuất áp dụng theo thứ tự dưới đây. Luật đầu tiên khớp được dùng, nên "Bún thịt nướng" tính là món nhanh.

| Kiểu | Cách nhận ra | Số quán (trên 655) | Phút |
|---|---|---|---|
| Có sao Michelin | cột `michelin = star` | 4 | **90** (60 × 1,5) |
| Món nhanh | tên có phở, bún, bánh mì, cơm tấm, hủ tiếu, bánh cuốn, xôi, bánh xèo, mì/mỳ Quảng, cao lầu, bánh canh, cháo, cơm gà, nem nướng...; hoặc ẩm thực noodle, ramen | 194 | **35** (60 × 0,6) |
| Lẩu, nướng, buffet | tên có lẩu, nướng, buffet, BBQ, steak; hoặc ẩm thực barbecue, buffet, steakhouse, fine dining, hotpot, grill | 43 | **75** (60 × 1,25) |
| Còn lại | | 414 | 60 |

Các hệ số này là ước lượng của nhóm đã ghi trong tài liệu cơ sở. Không có số đo riêng cho Việt Nam. Danh sách từ khoá nằm trong `visit_minutes.yaml`.

### 2.4. Các vấn đề dữ liệu tìm được (chưa sửa, cần bạn quyết)

Theo quy tắc hiện tại, mình chỉ được ghi vào DB các cột mô tả, `search_lex` và embedding. Vì vậy các việc dưới đây cần làm qua pipeline Journie-Data:

- **Sai loại:**
  - Thảo Cầm Viên là vườn thú (`attraction.zoo`).
  - Dinh Độc Lập nên là di tích.
  - TomuraLee, Vin Gallery, Hải An, Inlen, Lotus, Jack Clayton là phòng tranh, không phải bảo tàng.
  - Kỳ Đài Quang Trung là phố ăn đêm.
  - Trixie là quán cà phê.
  - Thời gian của các điểm này đã được sửa bằng số riêng ở mục 2.2.
- **Đóng cửa hoặc chưa rõ còn hoạt động không** (theo bộ nhớ: bỏ khỏi dữ liệu thay vì đánh dấu):
  - Bảo tàng Hồ Chí Minh (Nhà Rồng) đóng cửa sửa chữa từ 7/5/2026. *Tra lại khi làm:* kế hoạch là mở lại dịp 2/9, và [Nhân Dân](https://nhandan.vn/ocop/anh-ben-nha-rong-khoac-dien-mao-moi-sau-3-thang-chinh-trang-post979881.html) đưa tin Bến Nhà Rồng đã khoác diện mạo mới sau 3 tháng chỉnh trang. Vì vậy **không bỏ**.
  - Công viên nước Hồ Tây chỉ mở mùa hè.
  - Website của Snow Town không còn hoạt động.
  - Polygon Musik không thấy hoạt động gần đây.
  - Taste of The Soul không có địa điểm cố định.
- **Giờ mở cửa cần đối chiếu:**
  - Chợ đêm phố cổ chỉ mở tối cuối tuần.
  - Bảo tàng Phòng không – Không quân chỉ mở cuối tuần.
  - Cột cờ chỉ cho lên tầng một.
  - Một phần công viên 23/9 bị rào để làm ga đường sắt.
- **Sai địa chỉ:** Bảo tàng Lịch sử TP.HCM ở số 2 Nguyễn Bỉnh Khiêm, Quận 1 (trong Thảo Cầm Viên).

## 3. Không làm trong đợt này

- **Hệ số theo nhịp độ** (chậm ×1,25, nhanh ×0,8). Luật rules-v4 vừa chốt đã chỉnh số điểm theo nhịp độ. Nếu kéo dài thêm thời gian từng điểm theo nhịp độ thì hai cơ chế sẽ chồng lên nhau, và các mục tiêu vừa đo sẽ lệch.
- **Hệ số theo diện tích, độ nổi tiếng, số người, cuối tuần.** Dữ liệu chưa có diện tích. Hạng A–D cũng không so được giữa các thành phố: TP.HCM có 822 điểm hạng D, trong khi Hà Nội hầu hết là hạng C.
- **Bổ sung điểm lớn cho Huế và Đà Nẵng** (mục 1.3).

## 4. Ảnh hưởng và cách kiểm tra

- **Backend:** thêm test cho hàm tính thời gian: số riêng, kiểu quán, số theo loại, mặc định. Thêm test kiểm tra thẻ địa điểm có trường `visit_minutes`. File yaml được kiểm tra lúc khởi động: số phút phải dương và id phải có thật trong dữ liệu.
- **Frontend:** `tsc`, `oxlint`, và một test so bảng dự phòng với bảng của backend.
- **Đo lại toàn bộ bộ kiểm tra của rules-v4:** bảng mục tiêu với hai ngày khởi hành, 192 kiểm tra, các kiểm tra chỉnh sửa và đổi lịch. Dự kiến:
  - Ngày có quán món nhanh sẽ trống hơn, nên có thể thêm một điểm.
  - Ngày có Cầu Vàng hay Thảo Cầm Viên sẽ ít điểm hơn.
  - Nếu mục tiêu nào không đạt, mình báo lại kèm số liệu, không tự nới mục tiêu.
- **Xem thử trong trình duyệt** một chuyến có Thảo Cầm Viên và một quán phở.

## 5. Cần bạn chốt

1. Dùng số "1 nguồn" (9 điểm), hay chỉ nhận số có 2 nguồn hoặc nguồn chính thức?
2. Làm luôn phần quán ăn theo kiểu món (mục 2.3)?
3. Các vấn đề dữ liệu ở mục 2.4 có làm trong đợt này không, hay để đợt Journie-Data sau?

## 6. Đã làm (2026-11-25)

**Backend (`journie-be`, chưa commit):**
- `app/services/routing/visits.py` (mới): một hàm `of_place` cho toàn backend. Thứ tự: số riêng, sao Michelin, kiểu quán, loại, mặc định.
  - Từ khoá được so cả dấu, nên "Lầu 3" không bị tính là lẩu.
  - Tên viết không dấu giữ số theo loại, vì "Xin Chao" hay "Pho Co" dễ bị đọc nhầm thành cháo hay phở.
  - "Nem nướng" và "bò lá lốt" tính là món nhanh.
- `config/visit_minutes.yaml` lên `visit-minutes-v2`: thêm khối `restaurant_style` và `places` (28 điểm, mỗi dòng kèm nguồn).
- Routing xếp giờ bằng `of_place`. `PoiCard` có thêm `visit_minutes`. Trong request routing, trường này là độ dài điểm dừng, nên độ dài bạn tự chỉnh không bị backend ghi đè khi xếp giờ lại. Lỗi ghi đè này có từ trước, do agent review tìm ra.
- Test mới: `tests/test_routing_visits.py` (21 test) và một test chạy với DB thật, kiểm tra cả 28 id đều có trong `pois`. Backend: 448 test qua, ruff sạch.
- `poi_overrides.csv`: sửa loại cho 10 điểm ở mục 2.4. Importer áp dụng ở lần nhập dữ liệu sau.
- `interest_map.v2.yaml`: thêm `attraction.zoo` vào nhóm Thiên nhiên, để Thảo Cầm Viên không biến mất khỏi kết quả sau khi đổi loại. Thêm `attraction.gallery` vào nhóm Văn hoá, để 6 phòng tranh vẫn hiện như khi còn bị xếp là bảo tàng.
- Tài liệu: `docs/API.md`, `docs/routing-frontend.md`.

**Frontend:**
- `poiFromCard` dùng `card.visit_minutes`. Bảng dự phòng chép đúng số của backend, mặc định 40.
- `tests/visit_minutes_match.py` báo lỗi khi hai bảng lệch nhau.

**Sửa thêm sau lần đo đầu.** Khi máy dùng thời gian thật (ngắn hơn trước), lần đo đầu lộ ra các lỗi sau. Mỗi lỗi được sửa có test hoặc đo lại:
- *Bảo tàng chỉ mở buổi sáng bị đẩy xuống buổi tối* (3–9 chuyến không xếp được giờ). Trên máy, điểm đầu ngày được tới miễn phí, còn backend tính đường đi từ trung tâm thành phố. Sửa: với lịch mới, điểm đầu ngày phải vẫn vừa giờ mở cửa khi đến muộn 20 phút (`FIRST_LEG_ALLOWANCE` trong `solver.ts`).
- *Điểm ngoài trời bắt đầu lúc 14:40* (nhịp chậm 15, mục tiêu tối đa 12). Bữa trưa 35 phút làm buổi chiều bắt đầu sớm hơn. Sửa ở backend (`holds()`): nếu điểm đầu buổi chiều ở ngoài trời mà vẫn bắt đầu trong khung tránh nắng, giờ nghỉ được kéo tới khi hết khung đó, miễn là ngày còn chỗ. Có test mới.
- *Ăn nhà hàng ngoài giờ ăn* (đi bộ 24–30, mục tiêu tối đa 20). Sửa: với lịch mới, máy chỉ chọn nhà hàng vào bữa sáng (trước 9:30) hoặc trong giờ trưa và giờ tối. Quầy ăn vặt và nơi bạn đã chọn không bị luật này giới hạn.
- *Chuyến đi bộ có Cầu Vàng không xếp được giờ* (4–6 chuyến, khi Cầu Vàng còn tính 360 phút). Hết lỗi sau khi giới hạn 2 giờ (mục dưới).

**Giới hạn thời gian mỗi điểm** (bạn quyết định ngày 2026-11-25: "các điểm không lớn tới mức đó", rồi "điểm tham quan tối đa 1 tiếng 30"):
- Điểm tham quan (di tích, bảo tàng, phòng tranh, chùa, đền, nhà thờ, công viên, vườn, chợ, trung tâm thương mại, vườn thú, khu vui chơi): tối đa **90 phút**.
- Còn lại (quán ăn, cà phê, bar, karaoke, rạp phim, nhà hát): tối đa **120 phút**.
- `visit_minutes.yaml` có `max_minutes` theo nhóm loại. Giới hạn áp dụng cho mọi nơi, kể cả số riêng; loader báo lỗi nếu số theo loại vượt giới hạn, và có test kiểm tra.
- Bị hạ xuống 90 phút: Cầu Vàng (nguồn 360), Thảo Cầm Viên (180), Bảo tàng Lịch sử Quân sự, Dân tộc học, Phòng không – Không quân (150), Hoàng thành Thăng Long và Bảo tàng Chứng tích Chiến tranh (120), Bảo tàng Phụ nữ (105), cùng số chung của vườn thú (120) và khu vui chơi (180). Rạp phim từ 150 xuống 120; Binh Minh Jazz Club 120.
- Bạn vẫn tự kéo dài được một điểm trong ứng dụng (tối đa 6 giờ), và độ dài đó được giữ khi xếp giờ. Vì không còn điểm nào từ 4 giờ trở lên, luật "máy không tự chọn điểm từ 4 giờ" đã được bỏ.

**Chỉnh tiếp cho 4 mục mềm** (bạn yêu cầu "chỉnh tiếp"):
- **Mức phạt bắt đầu điểm ngoài trời trong 11–15 giờ** (`rules.yaml` `avoid_hours.penalty_minutes`) tăng từ 15 lên 20 phút. Mức 30 đẩy thời gian chờ nơi chưa mở cửa lên 203 phút (mức tối đa 150).
- **Cửa hàng bách hoá và karaoke được tính là trong nhà.** Trước đây ứng dụng coi Takashimaya hay Lotte là ngoài trời.
- **Nhà hàng ngoài giờ ăn được phép khi không còn loại điểm nào khác vừa,** giống luật "không ăn hai lần liền". Nhờ vậy ngày nhịp nhanh không bị hụt điểm.
- **Nơi không phải quán ăn và chỉ mở từ 16:00 là điểm buổi tối** (chợ đêm phố cổ, chợ đêm Helio): bắt đầu từ 18:00, mỗi ngày tối đa một nơi. Trước đó Helio bị xếp vào buổi chiều và phải chờ tới 4 tiếng cho tới giờ mở cửa.

**Kết quả đo cuối** (576 chuyến):
- Tất cả chuyến đều xếp được giờ, 0 lỗi, không bỏ nơi nào bạn đã chọn.
- 192 kiểm tra cũ qua; số cặp ăn liền nhau bằng mức tối thiểu (38 và 38). Kiểm tra chỉnh sửa và đổi lịch không đổi.
- Đã đạt 4 mục từng hụt: điểm ngoài trời buổi trưa ở nhịp vừa (22 và 24, mức 30), số điểm mỗi ngày ở nhịp nhanh (7,28 và 7,27), bữa tối, và thời gian chờ nơi chưa mở cửa (35 và 111, mức 150).
- Còn 2 mục:
  - **Ngày nhịp nhanh có khoảng trống trên 4 giờ:** 2 ngày (mức tối đa 1), cả thứ Hai và thứ Năm. Cả 4 ngày đều là ngày thứ 3 của chuyến Đà Nẵng nhịp nhanh: dữ liệu Đà Nẵng chỉ có khoảng 10 điểm tham quan, nên ngày cuối hết chỗ để đi giữa bữa trưa và bữa tối. Sửa bằng cách bổ sung điểm cho Đà Nẵng (mục 1.3), không phải bằng luật.
  - **Tổng phút các chặng dưới 45 phút, thứ Hai:** 11.125 (mức 11.000, vượt 1,1%), vì mỗi ngày nay có nhiều điểm hơn. Thứ Năm đạt (10.732).

**Kết quả đo với giới hạn 90/120 phút và DB đã sửa** (576 chuyến, sau khi cập nhật bản danh sách địa điểm của bộ đo theo DB mới):
- Tất cả chuyến đều xếp được giờ, 0 lỗi, không bỏ nơi nào bạn đã chọn. Mọi mục bữa tối đều đạt. Ăn nhà hàng ngoài giờ ăn: 0 với taxi, 12 với đi bộ (mức tối đa 20).
- 192 kiểm tra cũ qua; số cặp ăn liền nhau bằng mức tối thiểu (34 và 34). Kiểm tra chỉnh sửa và đổi lịch không đổi.
- Còn hụt 4 mục mềm, đều sát mức:
  - Điểm ngoài trời bắt đầu 11–15 giờ, nhịp vừa: 35 vào thứ Hai và 31 vào thứ Năm (mức tối đa 30; trước rules-v4 là 116).
  - Số điểm mỗi ngày, nhịp nhanh, thứ Năm: 7,16 (mục tiêu ít nhất 7,2).
  - Ngày có khoảng trống trên 4 giờ, nhịp nhanh, thứ Năm: 2 (mức tối đa 1).
- Lý do: điểm ngắn hơn nên lịch dồn thêm điểm vào buổi trưa và đầu giờ chiều. Phần nghỉ trưa mới chỉ dời điểm *đầu tiên* của buổi chiều qua 15:00.

**Kết quả đo trước khi giới hạn 2 giờ** (576 chuyến, thứ Hai và thứ Năm, taxi và đi bộ):
- Tất cả chuyến đều xếp được giờ, 0 lỗi, không bỏ nơi nào bạn đã chọn. Thứ Hai đạt mọi mục tiêu.
- Thứ Năm hụt 2 mục, mỗi mục 1 ngày:
  - Ngày có bữa tối, nhịp vừa: 61 (mục tiêu ít nhất 62).
  - Ngày có bữa tối, đi bộ nhịp chậm: 34 (mục tiêu ít nhất 35).
- 192 kiểm tra cũ vẫn qua. Số cặp ăn liền nhau là 26, trong khi tối thiểu có thể là 25 (trước đây bằng nhau, 54 và 54).
- Sau các sửa từ review (nghỉ trưa không quá 180 phút tính từ lúc đến, độ dài bạn tự chỉnh được giữ, so tên quán có dấu), lần đo cuối cho cùng kết quả như trên.
- Kiểm tra chỉnh sửa và đổi lịch không đổi: bữa tối vẫn được giữ khi xoá hoặc kéo dài điểm đầu, không bữa tối nào bị dời trước 17:30, không điểm nào bị dời sớm hơn.
- **Đánh đổi cần biết:** điểm ngắn hơn nên ngày đủ số điểm sớm hơn. Số ngày có bữa tối giảm, ví dụ thứ Hai nhịp vừa từ 78 xuống 65, nhịp chậm từ 43 xuống 34. Vẫn trên mục tiêu, nhưng sát hơn trước.

**Journie-Data:** `review_overrides.csv` thêm 10 dòng sửa loại và bỏ Taste of The Soul. Bản sao lưu ở `work/backup_2026-11-25/`.

**Chưa làm, chờ bạn đồng ý vì phải ghi vào DB dùng chung** (ngoài các cột được phép, và có xoá một dòng):
- Đổi `category` và `kind` cho 10 điểm ở trên.
- Xoá Taste of The Soul.
- Đặt giờ Chợ đêm phố cổ là `Fr-Su 18:00-23:00`: hai nguồn ([Vietnam Airlines](https://www.vietnamairlines.com/us/vi/plan-book/travel/travel-guide/hanoi-night-market-old-quarter), [Vinpearl](https://vinpearl.com/vi/cho-dem-pho-co-ha-noi-cho-phien-cuoi-tuan-tap-nap-thu-hut-du-khach)) đều nói thứ Sáu đến Chủ nhật, đóng cửa khoảng 23:00–24:00.
- Sửa địa chỉ Bảo tàng Lịch sử TP.HCM thành 2 Nguyễn Bỉnh Khiêm.
- Đặt giờ Chợ đêm Helio là `Mo-Su 17:00-22:30` (đang lưu 09:00–22:30, nên máy xếp chợ đêm vào buổi sáng). Nguồn: [Vinpearl](https://vinpearl.com/vi/cho-dem-helio-da-nang-thien-duong-mua-sam-an-uong-sieu-hot-ve-dem), [mia.vn](https://mia.vn/cam-nang-du-lich/oanh-tac-cho-dem-helio-da-nang-to-hop-mua-sam-am-thuc-ve-dem-lon-nhat-da-nang-1868), [Foody](https://www.foody.vn/da-nang/cho-dem-helio).

**Để nguyên vì nguồn không đủ:**
- Giờ của Bảo tàng Phòng không – Không quân: hai nguồn mâu thuẫn nhau.
- Mùa mở của Công viên nước Hồ Tây: không có lịch năm 2026.
- Tình trạng của Snow Town và Polygon Musik: không có tin đóng cửa, chỉ là thiếu tin mới.
