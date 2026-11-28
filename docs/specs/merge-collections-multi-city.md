# Spec: Gộp nhiều bộ sưu tập thành một chuyến đi, đi nhiều thành phố chia theo ngày

Trạng thái: **đã duyệt và đã làm (2026-11-25).** Bạn chọn Cách B, và thêm yêu cầu: có một chế độ xem cả chuyến cuộn liền trên một trang, không tách từng ngày. Số ngày mỗi thành phố khi gộp được tính theo số điểm (cứ khoảng 5 điểm một ngày, ít nhất 1 ngày).
Ngày: 2026-11-25

Yêu cầu của bạn: (1) chọn nhiều bộ sưu tập rồi gộp lại để lên **một** chuyến đi; (2) chuyến đi được **đi qua nhiều tỉnh, thành**, mỗi ngày ở một thành phố.

## 1. Hiện trạng (đọc từ code)

- **Bộ sưu tập** (`PoiSet`: tên, mô tả, danh sách `poiIds`) có nút "Lập lịch trình" ở `SetPage.tsx:96`. Nút này mở `/app/plan` và gửi kèm `poiIds` của **một** bộ.
- **Trang Tạo lịch trình** chỉ giữ các điểm thuộc thành phố đang chọn (`PlanPage.tsx:159`, `poiById[id]?.city === params.city`). Một bộ có điểm ở Hà Nội và Huế thì chỉ phần của một thành phố được xếp; phần còn lại bị bỏ mà không báo.
- **Chuyến đi gắn với đúng một thành phố.** `Trip.city` là một giá trị, và mỗi `Day` chỉ có `index` và `stops`. `trip.city` được dùng ở **65 chỗ trong 18 file**: thời tiết theo ngày, ảnh bìa, tên chuyến, bản đồ, trang Đang đi, chỉnh lịch, chia sẻ…
- **Lập lịch và xếp giờ** gọi backend `POST /routing/days` và `POST /routing`, mỗi lần cho một thành phố.
- **Backend chưa có API `/trips`.** Chuyến đi đang lưu trên máy (`api/trips.ts` dùng chế độ máy khi route chưa có), nên đổi hình dạng `Trip` không đụng tới backend.

## 2. Phần 1: gộp nhiều bộ sưu tập (không đổi kiến trúc)

1. **Trang Bộ sưu tập** (`SetsPage`) có thêm chế độ "Chọn để gộp". Tick nhiều bộ, kể cả "Yêu thích"; thanh dưới cùng ghi "Đã chọn 3 bộ · 24 điểm", kèm nút **"Lập một chuyến đi"**.
2. Nút đó mở `/app/plan` với `poiIds` là **hợp các bộ, bỏ trùng, giữ thứ tự** (bộ chọn trước đứng trước) và `setName` là "Bộ A + Bộ B + …". Cơ chế gửi điểm sang trang lập lịch đang có sẵn, chỉ khác là gửi nhiều bộ cùng lúc.
3. Trên trang Tạo lịch trình, danh sách "Điểm bạn đã chọn" **nhóm theo thành phố**, kèm số điểm của mỗi thành phố. Nếu chỉ đi một thành phố mà có điểm ở thành phố khác, ghi rõ "12 điểm ở Hà Nội sẽ không nằm trong chuyến này" thay vì bỏ mà không báo.
4. Trang một bộ sưu tập giữ nút "Lập lịch trình" như cũ.

Phần này chỉ thêm giao diện và gom dữ liệu ở frontend, không đổi `Trip`, `PoiSet` hay API.

## 3. Phần 2: chuyến đi nhiều thành phố, chia theo ngày

Trên trang Tạo lịch trình, ô "Điểm đến" cho **chọn nhiều thành phố theo thứ tự đi**, mỗi thành phố một số ngày. Ví dụ: Hà Nội 2 ngày → Huế 1 ngày → Đà Nẵng 2 ngày, tổng 5 ngày, ngày bắt đầu chung. Khi gộp bộ sưu tập, các thành phố có điểm được điền sẵn theo thứ tự, mỗi nơi 1 ngày, bạn chỉnh lại được.

**Ngày di chuyển giữa hai thành phố không được lập lịch.** Journie không có dữ liệu máy bay, tàu hay xe khách. Ngày đầu ở thành phố mới chỉ bắt đầu ở điểm đầu tiên, không có chặng nối từ thành phố trước, và trên lịch có dòng nhắc "Di chuyển Hà Nội → Huế: tự sắp xếp".

Có hai cách làm, khác nhau ở chỗ có đổi mô hình dữ liệu hay không:

### Cách A: một chuyến, mỗi ngày tự mang thành phố (đổi mô hình `Trip`)

- **Mô hình:** `Day` thêm `city?: CityId`; thiếu thì lấy `trip.city`, nên chuyến cũ vẫn đọc được. `trip.city` là thành phố của ngày đầu.
- **Lập lịch:** chia các điểm theo thành phố, gọi `/routing/days` và `/routing` cho **từng chặng**, giống hệt hôm nay, rồi nối các ngày lại và đánh số ngày tiếp nhau.
- **Phải sửa 65 chỗ dùng `trip.city`** để đọc thành phố của từng ngày: thời tiết từng ngày, bản đồ, trang Đang đi, chỉnh hay đổi điểm một ngày (chỉ lấy điểm của thành phố ngày đó), chia sẻ, ảnh bìa, tên ("Hà Nội → Đà Nẵng · 5 ngày").
- **Hợp nhất với yêu cầu "một chuyến đi".** Nhưng đây là thay đổi mô hình dữ liệu của chuyến đi, tức đụng tới phần kiến trúc đã ghi trong báo cáo (domain `Trip`/`Day`). Khối lượng lớn: khoảng 18 file.

### Cách B: một hành trình gồm nhiều chuyến một thành phố (không đổi mô hình chuyến)

- **Mô hình:** mỗi thành phố là một `Trip` bình thường với ngày liên tiếp. Các chuyến này cùng một `journeyId` (trường mới, tuỳ chọn), kèm `journeyOrder`.
- **Lập lịch:** mỗi chặng là một lần lập lịch như hôm nay. Mọi màn hình chuyến đi giữ nguyên, vì mỗi chuyến vẫn chỉ có một thành phố.
- **Thêm giao diện "Hành trình":** ở trang Chuyến đi, các chặng gom thành một thẻ ("Hà Nội → Huế → Đà Nẵng · 5 ngày"). Bấm vào ra trang hành trình liệt kê các chặng, ngày đánh số liên tục. Từ đó mở từng chặng như một chuyến bình thường.
- **Ít rủi ro, không đổi kiến trúc** (chỉ thêm một trường tuỳ chọn và một trang). Đổi lại, khi chỉnh thì sửa từng chặng, và trên bảng điều khiển mỗi chặng tính là một chuyến.

### Đề xuất

**Làm Phần 1 trước, và Phần 2 theo Cách B.** Cách này đáp ứng "gộp bộ sưu tập, đi nhiều thành phố, chia theo ngày" mà không đụng mô hình chuyến đi đã ghi trong báo cáo. Nếu bạn cần đúng **một** chuyến (một thẻ, một trang, chỉnh xuyên chặng) thì làm Cách A, và phần mô hình dữ liệu trong báo cáo phải cập nhật theo.

## 4. Kiểm tra khi làm

- Gộp 3 bộ có điểm trùng thì điểm trùng chỉ còn một lần. Một bộ rỗng hoặc có điểm chưa tải được thì vẫn gộp được, và có ghi chú.
- Gộp các bộ có điểm ở 3 thành phố thì các thành phố được điền sẵn đúng thứ tự, và tổng số ngày bằng tổng các chặng.
- Mỗi chặng chỉ chứa điểm của thành phố đó, và không có chặng nối giữa hai thành phố.
- Thời tiết, bản đồ và ảnh bìa của mỗi ngày (A) hoặc mỗi chặng (B) theo đúng thành phố của nó.
- Chuyến một thành phố tạo như cũ không đổi gì. Chuyến đã lưu từ trước vẫn mở được.

## 5. Câu hỏi cho bạn

1. **Phần 2:** làm Cách B (đề xuất, không đổi kiến trúc) hay Cách A (một chuyến duy nhất, đổi mô hình `Trip`)?
2. **Số ngày mỗi thành phố khi gộp:** điền sẵn 1 ngày mỗi nơi hay chia theo số điểm (ví dụ cứ khoảng 5 điểm thành 1 ngày)? Đề xuất: chia theo số điểm, tối thiểu 1 ngày.

## 6. Đã làm

- `domain/journey.ts`: gom chặng (`journeysOf`), tên hành trình (`journeyRoute`), gợi ý chặng từ các điểm đã gộp (`suggestLegs`, tối đa `MAX_JOURNEY_DAYS` = 14 ngày), gộp điểm bỏ trùng (`mergedPlaces`). `Trip` thêm hai trường tuỳ chọn `journeyId` và `journeyOrder`; bản sao của một chặng không mang hai trường này.
- **Bộ sưu tập:** nút "Gộp thành một chuyến" bật chế độ chọn. Thanh dính trên đầu ghi số bộ, số điểm và tuyến đi, kèm nút "Lập một chuyến đi".
- **Tạo lịch trình:**
  - Các chặng được điền sẵn từ các điểm đã gộp.
  - "Đi tiếp thành phố khác" thêm chặng, mỗi chặng chọn thành phố và số ngày.
  - Mỗi chặng được lập lịch riêng trên các ngày nối tiếp nhau, ngân sách chia theo số ngày. Các chặng lưu thành bản nháp cùng một `journeyId`.
  - Danh sách điểm đã chọn báo rõ những điểm nằm ngoài các chặng.
- **Trang hành trình** `/app/journeys/:id`: cả hành trình trên một trang. Ngày đánh số liên tục, mỗi chặng có đầu mục riêng, giữa hai chặng có dòng nhắc tự sắp xếp di chuyển. Có nút lưu hoặc bỏ cả hành trình nháp.
- **Trang một chuyến:** nút "Từng ngày / Cả chuyến", và dòng "Chặng X/N của hành trình …" dẫn về trang hành trình.
- **Chuyến đi của tôi:** các chặng gom thành một thẻ hành trình. Khi bấm "Chọn nhiều" để xoá thì từng chặng tách ra để chọn riêng.
