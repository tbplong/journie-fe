# Spec: Chuyển động vòng 2 cho landing và trang trong app

Trạng thái: **bản nháp, đã được đánh giá lại (mục cuối), chờ duyệt.** Chưa sửa code.
Ngày: 2026-11-26

**Nguồn tham khảo:** 18 mẫu trên MotionSites, chọn từ 74 mẫu trong thư viện có chuyển động hoặc là màn hình app du lịch. Tài khoản đã hết lượt mở prompt, nên mình chỉ dựa vào phần mô tả và video xem trước, chưa đọc mã của các mẫu.

**Nguyên tắc như vòng 1:**
- Chỉ dùng thư viện `motion` có sẵn và ảnh thật của Journie, không lấy tài nguyên nào của MotionSites.
- Bật giảm chuyển động thì mọi thứ đứng yên.
- Không làm lại những gì Journie đã có: dải chữ chạy (HighlightsBar), hiệu ứng theo cuộn ở Story và HowItWorks, khối dính ở SampleItinerary, nét vẽ ở Adaptive, bản đồ ở Explore, chuyển trang và ô vàng của thanh tab.

## Landing

| # | Ý tưởng (mẫu tham khảo) | Đặt ở đâu | Chuyển động |
|---|---|---|---|
| **L1** | Vệt ảnh theo con trỏ (Mouse Trail CTA) | Phần CTA "Bắt đầu miễn phí" | Rê chuột qua phần CTA thì ảnh thật của 9 điểm đến lần lượt hiện theo đường con trỏ, xoay nhẹ, rồi mờ dần sau khoảng 0,9 giây. Mỗi lần tối đa 6 ảnh, cứ 90px mới hiện một ảnh. Trên điện thoại chỉ hiện một cụm ảnh tĩnh. |
| **L2** | Dải ảnh chạy theo cuộn (Scroll Marquee) | Một dải mới giữa Explore và CTA | Hai hàng ảnh thật chạy ngược chiều nhau. Cuộn trang thì ảnh chạy nhanh hơn và đổi chiều theo hướng cuộn, thả tay thì chậm dần về tốc độ thường. Rê chuột vào thì dừng và hiện tên nơi đó. |
| **L3** | Thẻ dính chồng lên nhau (Nimbus Sticky Cards, Card Stack) | Ba bước ở HowItWorks | Mỗi bước là một thẻ dính ở đầu trang. Thẻ sau trượt lên chồng lên thẻ trước, thẻ trước thu nhỏ còn 94% và tối đi một chút. Phần này thay cách HowItWorks đang chạy theo cuộn, nên chỉ làm nếu bạn thích kiểu này hơn. |

## Trang trong app

| # | Ý tưởng (mẫu tham khảo) | Đặt ở đâu | Chuyển động |
|---|---|---|---|
| **A1** | Thẻ kéo ngang có quán tính (Place Saver, Travel Explorer) | "Có thể bạn thích" ở bảng điều khiển | Kéo hoặc vuốt ngang, thả tay thì trôi tiếp rồi tự dừng ở thẻ gần nhất. Thẻ nghiêng nhẹ theo tốc độ kéo. Có nút mũi tên cho bàn phím và chuột. |
| **A2** | Bộ bài xoè ra (Card Ring, Card Stack) | Thẻ bộ sưu tập ở trang Bộ sưu tập | Ba ảnh bìa xếp chồng như bộ bài. Rê chuột thì xoè ra ba hướng. Khi đang chọn để gộp, bộ được chọn nhấc lên và có viền vàng. |
| **A3** | Bảng kéo lên có điểm dừng (Place Saver) | Bảng chi tiết địa điểm trên điện thoại | Kéo tay cầm lên để mở rộng: nửa màn hình rồi cả màn hình. Kéo xuống để thu lại hoặc đóng, thả tay thì bật về điểm dừng gần nhất. |
| **A4** | Lần lượt nổi lên khi cuộn (Heritage Grove, vòng 1) | Danh sách chuyến đi, bộ sưu tập, kết quả Khám phá | Thẻ nổi lên 14px khi cuộn tới, mỗi thẻ cách nhau 0,06 giây, tối đa 8 thẻ. Thẻ ngoài màn hình không phải chờ. |
| **A5** | Đường lộ trình tự vẽ (giống bản đồ vòng 1) | Dòng thời gian từng ngày ở trang chuyến đi | Đường dọc nối các điểm tự vẽ từ trên xuống khi mở một ngày, các điểm hiện lần lượt theo nét vẽ. |

## Đề xuất

- **Landing:** làm **L1 và L2** trước, vì cả hai đều mới và dùng được ảnh thật Journie đang có. L3 chỉ làm nếu bạn muốn đổi HowItWorks.
- **Trong app:** làm **A1, A2 và A4** trước, vì ít rủi ro và chạm tới các trang dùng nhiều nhất. A3 đụng tới bảng `Sheet` dùng chung nên cần thử kỹ hơn. A5 là thay đổi nhỏ.

## Kiểm tra khi làm

- Kéo thẻ, xoè bài và kéo bảng đều dùng được bằng bàn phím, trình đọc màn hình đọc đúng.
- Ở bề ngang 375, 768 và 1440px không tràn ngang.
- Bật giảm chuyển động thì không còn gì chạy, cũng không có vệt ảnh hay dải ảnh chạy.
- Cuộn vẫn mượt. Dải ảnh dừng khi nằm ngoài màn hình, vệt ảnh chỉ chạy khi con trỏ ở trong phần CTA.

## Câu hỏi cho bạn

Làm những mục nào? Đề xuất: **L1, L2, A1, A2, A4**.

## Đánh giá lại (2026-11-26, đã kiểm lại với code)

- **Bỏ L1:** phần CTA đã có cảnh hoàng hôn chạy theo cuộn, tiêu đề hiện dần và nút hút theo con trỏ. Thêm vệt ảnh sẽ che tiêu đề và nút bấm chính, còn người dùng điện thoại không thấy gì.
- **Bỏ L3:** HowItWorks đã có đường đi sáng dần theo từng bước, và SampleItinerary đã là phần dính khi cuộn.
- **Bỏ A3 ở đợt này:** `Sheet` hiện chỉ có kiểu mở bên phải và ở giữa. Làm bảng kéo lên phải thêm một kiểu mở cho bảng dùng chung, kéo theo việc xử lý kéo bảng lẫn lẫn cuộn bên trong, tiêu điểm bàn phím và xung đột với cuộn mượt (`data-lenis-prevent`). Nên tách thành spec riêng.
- **A4 và A5 đã có sẵn (bản nháp liệt kê nhầm):** trang Chuyến đi và Bộ sưu tập đã nổi lên lần lượt cách nhau 0,06 giây, Khám phá có hiệu ứng nổi lên riêng, và dòng thời gian đã có đường kẻ chạy dần qua từng điểm.
- **A2, làm có chỉnh:**
  - Lúc nghỉ, ba ảnh bìa xếp chồng, nghiêng −4°, 0° và 3°.
  - Rê chuột hoặc dùng bàn phím tới thẻ thì xoè ra ±8° và ±14px, chuyển động lò xo khoảng 0,3 giây, chỉ trên máy có chuột. Trên điện thoại giữ nguyên chồng ảnh.
  - Bộ đang được chọn chỉ nhấc thêm 4px.
- **A1, làm có chỉnh:** chỉ trên điện thoại, dùng CSS scroll-snap trên danh sách có sẵn. Mỗi thẻ rộng khoảng 78% màn hình và hé thẻ kế. Bỏ kéo bằng JS, bỏ nghiêng theo tốc độ kéo, tắt hiệu ứng nghiêng (Tilt) bên trong. Trên màn lớn giữ lưới như cũ.
- **L2, làm bản êm:**
  - Một hàng trên điện thoại, hai hàng từ màn vừa trở lên. Mỗi vòng khoảng 40 giây.
  - Cuộn làm ảnh chạy nhanh tối đa 2,5 lần rồi chậm lại trong 0,6 giây. Bỏ đổi chiều.
  - Tên nơi luôn hiện. Rê chuột hoặc dùng bàn phím thì chỉ dừng lại.
  - Dùng ảnh khác 9 ảnh của bản đồ.
  - Dừng khi ngoài màn hình. Bật giảm chuyển động thì thành một hàng ảnh đứng yên.

**Chốt đợt này:** A2, rồi A1 (bản cho điện thoại), rồi L2 (bản êm).

## Lựa chọn thêm cho trang trong app (2026-11-26, bạn muốn chú trọng phần này)

Mình đã rà code. Những chỗ **đã có chuyển động** thì không đụng tới:
- Khám phá: kết quả xếp lại khi lọc, tim nổ khi lưu.
- Chuông thông báo.
- Trang Đang đi.
- Dòng thời gian có đường kẻ chạy dần.
- Chuyển trang, ô vàng của thanh tab.

Những chỗ **chưa có**:

| # | Ý tưởng | Đặt ở đâu | Chuyển động | Công sức |
|---|---|---|---|---|
| **B1** | Số liệu tự lăn | Ô tổng của chuyến đi (chi phí, số điểm, thời gian di chuyển) | Khi chỉnh, kéo đổi chỗ, thêm hay bớt điểm, các con số lăn tới giá trị mới trong 0,5 giây và hơi loé màu: xanh khi giảm chi phí, đất nung khi tăng. Dùng lại `CountUp` có sẵn. | Nhỏ |
| **B2** | Bay vào bộ sưu tập | Lưu một nơi ở Khám phá, Gợi ý hay bảng chi tiết | Ảnh nhỏ của nơi đó bay theo đường cong tới ảnh đại diện (nơi có mục Bộ sưu tập) rồi ảnh đại diện nhún một nhịp. Tim nổ (hiện chỉ có ở Khám phá) cũng dùng ở mọi chỗ lưu. | Vừa |
| **B3** | Thông báo vuốt để tắt | Các thông báo nhỏ góc màn hình | Vuốt sang phải để tắt. Thông báo có nút "Hoàn tác" thì có vòng đếm ngược thời gian còn lại. | Nhỏ |
| **B4** | Bản nháp mở ra theo nhịp | Lần đầu mở bản nháp vừa lập xong | Ghim trên bản đồ rơi xuống lần lượt theo thứ tự điểm, các điểm trên dòng thời gian hiện ra cùng nhịp, tổng chi phí đếm lên. Chỉ chạy một lần, mở lại thì hiện ngay. | Vừa |
| **B5** | Bản đồ và dòng thời gian đi cùng nhau | Trang chuyến đi | Rê chuột lên một điểm trong dòng thời gian thì ghim trên bản đồ nhấp nháy và đoạn đường tới điểm kế tự vẽ ra. Bấm ghim thì dòng thời gian cuộn tới điểm đó. | Vừa |
| **B6** | Vuốt để đổi ngày | Trang chuyến đi trên điện thoại | Vuốt ngang trên phần ngày để sang ngày trước hoặc sau. Dùng chuyển động trượt ngày đang có, thêm cử chỉ vuốt. | Nhỏ |
| **B7** | Thanh tiến độ hành trình | Trang hành trình nhiều chặng | Một tuyến nhỏ dính ở đầu trang (Hà Nội → Huế → Đà Nẵng). Chặng đang đọc sáng lên và được tô dần theo vị trí cuộn. | Nhỏ |
| **B8** | Ảnh hiện từ mờ sang rõ | Ảnh bìa ở Chuyến đi, Bộ sưu tập, Khám phá, Gợi ý | Ảnh hiện từ mờ và hơi phóng to rồi về rõ khi tải xong, thay cho việc đang nhảy từ trống sang có ảnh. | Nhỏ |

**Đề xuất cho phần trong app:** A2 (bìa bộ sưu tập), A1 (kéo ngang trên điện thoại), **B1, B4, B5**. B4 và B5 làm phần lập lịch, nơi người dùng dành nhiều thời gian nhất, trở nên sống động. B1 và B3 nhỏ, ít rủi ro, có thể làm kèm.

## Đã làm (2026-11-26)

- **A2**, `SetsPage.tsx`: bìa bộ sưu tập thành chồng ảnh, xoè ra khi rê chuột hoặc dùng bàn phím tới thẻ, chỉ trên máy có chuột. Bộ đang được chọn để gộp thì nhấc lên 4px.
- **A1**, `Dashboard.tsx`: trên điện thoại, "Có thể bạn thích" là hàng cuộn ngang bắt vị trí, mỗi thẻ rộng khoảng 76% màn hình, tắt hiệu ứng nghiêng (Tilt). Từ màn `sm` trở lên giữ lưới như cũ.
- **B1**, `trip/parts.tsx`: số điểm, thời gian di chuyển và chi phí lăn tới giá trị mới. Chi phí loé xanh khi giảm, đất nung khi tăng.
- **B4**, `TripPage.tsx`, `RouteMap.tsx`, `Timeline.tsx`: lần đầu mở một bản nháp trong phiên này thì ghim rơi xuống và các điểm hiện ra cùng nhịp, cách nhau 0,12 giây. Trình duyệt nhớ những bản nháp đã chạy hiệu ứng trong `sessionStorage` (`journie-revealed`).
- **B5**, cùng ba file trên: rê chuột hoặc dùng bàn phím tới một điểm thì ghim nhấp nháy và đoạn đường tới điểm kế tự vẽ, màu vàng có viền tối. Bấm ghim thì dòng thời gian cuộn tới điểm đó.
