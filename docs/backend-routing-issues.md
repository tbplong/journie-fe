# Lỗi phía backend khi nối `/routing` và `/routing/days` (kiểm 19/11/2026)

Kiểm trên backend chạy ở máy (`journie-be` commit `d646272`, không có `OSRM_URL`, nên mọi kết quả là `travel_estimated`).
Frontend đã sửa các lỗi phía mình; các mục dưới đây cần sửa ở backend.

## 1. Lịch có chỗ chờ hàng giờ (trung bình)

`POST /routing`, 12 điểm, 21–22/11/2026, mọi điểm ghim theo kết quả `/routing/days`: điểm cuối ngày 1 (bar) đến 12:48, bắt đầu 19:00, `wait_minutes` 372.
Các lần khác: chờ 172 phút (16 điểm, 2 ngày), 127 (24 điểm, 3 ngày), 171 + 166 + 165 + 120 (50 điểm, 7 ngày).

Nguyên nhân: `app/services/routing/service.py` `plan_cost()` chỉ tính luật bị vi phạm, độ cân bằng và thời gian di chuyển; thời gian chờ không bị tính, và `busy_seconds()` cũng bỏ qua thời gian chờ.

Đề xuất: cộng tổng thời gian chờ vào chi phí (hoặc giới hạn chờ mỗi điểm rồi dời điểm sang vị trí hay ngày khác), và tính thời gian chờ vào `busy_minutes`.

## 2. Chuyến dài ít điểm: bỏ trống nguyên ngày (trung bình)

`POST /routing/days`, ngày 08:00–21:00, không ghim. Số điểm mỗi ngày:

- 7 ngày, 12 điểm: `[2,3,2,3,2,0,0]`
- 10 ngày, 20 điểm: `[5,5,4,4,1,1,0,0,0,0]`
- 14 ngày, 50 điểm: `[5,11,10,10,10,4,0,0,0,0,0,0,0,0]`; hai ngày đầy 707/780 và 708/780 phút, trong khi 8 ngày trống.

Không có cảnh báo nào trả về.

Đề xuất: chi phí cân bằng nên nhạy với từng ngày (ví dụ tổng bình phương tải mỗi ngày) thay vì `max - min`.

## 3. Ngày gần đầy: `/routing` bỏ một điểm mà `/routing/days` vừa xếp (trung bình)

Gọi `/routing/days` không ghim, rồi gọi `/routing` với đúng các điểm đã xếp, ghim theo ngày vừa nhận được (frontend làm đúng như vậy). 5/36 lần bị trả `no_time`:

- 2 ngày, 45 điểm: tải 779/780 và 779/780 → `oc-van-798627: no_time`
- 3 ngày, 50 điểm → `terroir-wine-bar-36dddd`, `luong-ky-mi-gia-df1954` đều `no_time`

Khi đó nút "Tạo lịch trình" không hoàn tất được.

Đề xuất: khi mọi điểm đã ghim, bắt đầu tìm từ đúng thứ tự client gửi (thứ tự trong ngày của bản nháp) rồi mới cải thiện.

## 4. Báo `no_time` sai (trung bình)

`POST /routing`, 15 điểm, 27–28/11/2026 (thứ Sáu, thứ Bảy), không ghim. Hai điểm bị trả `no_time`:

- `bao-tang-luc-luong-vu-trang-mien-dong-na-af47f7`
- `giga-mall-pham-van-dong-39f7b3`

Trong khi đó thứ Sáu trống từ 12:27 đến 17:00 (chờ 268 phút), và tải hai ngày chỉ 418 và 457 trên 780 phút. Ghim hai điểm này vào thứ Sáu thì xếp được hết.

Đề xuất: sau `rebalance()` chạy thêm một lượt chèn các điểm chưa xếp; ưu tiên điểm có ít khung giờ mở.

## 5. Lý do `closed_on_trip_days` dùng cả khi điểm đang mở (nhẹ)

Ngày 12:00–12:30 với 10 điểm ở trung tâm: cả 10 điểm bị trả `closed_on_trip_days`, kể cả chợ Bến Thành (mở 00:00–22:00). Thật ra điểm vẫn mở, chỉ là khung ngày ngắn hơn thời gian tham quan.

Đề xuất: trả `no_time` trong trường hợp này. Frontend hiện đã đổi lời cho đúng: "không có khung mở đủ dài trong giờ bạn chọn".

## 6. Lỗi 422 không theo dạng problem+json và trả lại cả request (nhẹ)

Body lỗi có dạng:

```json
{"detail": [{"type": "value_error", "msg": "...", "input": {"...": "toàn bộ request"}}]}
```

Nên trả cùng dạng `application/problem+json` như các lỗi khác và bỏ trường `input`.

## 7. Không có giới hạn số điểm mỗi ngày (nhẹ)

Người dùng chọn "Tối đa 6 điểm mỗi ngày" nhưng `/routing/days` vẫn xếp 7 điểm. `RoutingRequest` không có trường nào cho việc này.

Đề xuất: thêm `max_places_per_day` (không bắt buộc).

## 8. Lịch dồn hết vào buổi sáng, bỏ qua giờ ăn (nhẹ)

Với khung 08:00–21:00, ngày thường kết thúc lúc 13:00–14:40. Có ngày hai bữa trưa liền nhau (cảnh báo `not_adjacent:food` ở mọi ngày), và không ngày nào có bữa tối.

Đề xuất: thêm khung giờ ăn cho `food.restaurant` (trưa khoảng 11:00–13:30, tối khoảng 18:00–20:00) và trải đều lịch trong ngày.

## 9. Dữ liệu giờ trong database cũ

Backend vẫn dùng bộ dữ liệu cũ. Bộ mới (`Journie-Data/places_1000/places_1000.parquet`, 898 điểm) đã sửa giờ của nhiều điểm. Ví dụ Bảo tàng Chứng tích Chiến tranh: 07:30–17:30, không nghỉ trưa.

Cần nhập lại file parquet mới vào database.

## 10. Thêm từ các vòng kiểm sau (19/11/2026)

- **`/routing` không nhận thời lượng và thứ tự do người dùng đặt.** Request không có `visit_minutes` cho từng điểm, cũng không có cờ giữ thứ tự. Vì vậy "Xếp lại lịch" luôn đưa thời lượng về mặc định theo loại và tự đổi thứ tự. Frontend hiện chỉ báo cho người dùng biết và cho Hoàn tác.
  Đề xuất: thêm `visit_minutes` (không bắt buộc) vào từng card, và `keep_order: true` cho các ngày đã ghim.
- **Khi mọi điểm đã ghim, backend vẫn tự sắp lại cả ngày** (liên quan mục 3). Frontend phải giữ nguyên các ngày không đổi để không đảo lịch người dùng.
  Đề xuất: ngày nào mọi điểm đều ghim và không có sự cố thì giữ đúng thứ tự client gửi.
- **`visit_minutes.yaml` vẫn là số tạm.** Đã có bản thay thế `Journie-Data/places_1000/visit_minutes.v1.yaml`, cùng định dạng mà `load_visit_minutes` đọc (`version`, `default`, `categories`, kèm khối `ranges` để sẵn). Căn cứ ở `docs/visit-duration-basis.md`.
  Bộ dữ liệu mới còn có cột `expected_visit_duration_min` cho từng điểm. Backend nên ưu tiên cột này hơn số theo loại.
- **Ước lượng thời gian đi giữa frontend và backend lệch nhau với taxi và đi bộ** (lệch khoảng 2 phút mỗi chặng). Frontend đã chỉnh theo cách backend ước lượng cho xe máy. Nên có một hàm chung, hoặc backend trả kèm hệ số tốc độ đã dùng.
