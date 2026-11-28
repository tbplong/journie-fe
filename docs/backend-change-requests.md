# Danh sách việc backend cần làm (Journie)

Gửi nhóm backend (repo `journie-be`, kiểm trên commit `d646272`, ngày 19/11/2026).
Mỗi mục đã được đối chiếu với code thật của backend; vị trí code ghi dạng `file` + hàm hoặc số dòng.
Nguồn của danh sách: các lỗi routing tìm được khi kiểm thử (`docs/backend-routing-issues.md`), những gì
tính năng nhiều thành phố cần, và bộ dữ liệu mới trong `Journie-Data/places_1000/`.

Mức ưu tiên:

- **P0**: làm hỏng lịch trình hoặc cho người dùng thấy dữ liệu sai.
- **P1**: cần cho tính năng mới (nhiều thành phố, thời lượng theo từng điểm, giới hạn điểm mỗi ngày).
- **P2**: cải thiện, làm sau cũng được.

## Bảng tóm tắt

| Mục | Việc cần làm | Ưu tiên | Nhóm |
|---|---|---|---|
| A1 | Nhập `places_hcm_verified.parquet` (1.014 điểm) vào database | P0 | A. Dữ liệu |
| A2 | Dùng giờ mở cửa mới đúng cách với điểm `hours_contradicted` và điểm không có giờ | P0 | A. Dữ liệu |
| A3 | Lưu và dùng cột `expected_visit_duration_min` | P1 | A. Dữ liệu |
| A4 | Thay `visit_minutes.yaml` bằng `visit_minutes.v1.yaml` | P1 | A. Dữ liệu |
| A5 | Cột `city`, `outside_region` theo từng thành phố, dữ liệu Hà Nội / Đà Nẵng / Huế | P1 | A. Dữ liệu |
| B1 | Retrieval nhận nhiều điểm đến (bỏ `SUPPORTED_DESTINATION` một giá trị) | P1 | B. Nhiều thành phố |
| B2 | Lọc catalogue theo `city` | P1 | B. Nhiều thành phố |
| B3 | Lọc `names.lookup` và `exact_ids` theo `city` (và theo `outside_region`) | P1 | B. Nhiều thành phố |
| B4 | Thêm `city` vào `PoiCard` | P1 | B. Nhiều thành phố |
| B5 | Câu cảnh báo nêu đúng tên thành phố | P2 | B. Nhiều thành phố |
| B6 | `--prune` của script nhập chỉ xoá trong đúng thành phố của file | P1 | B. Nhiều thành phố |
| C1 | Lịch có chỗ chờ hàng giờ | P0 | C. Routing |
| C2 | Chuyến dài ít điểm bỏ trống nguyên ngày | P0 | C. Routing |
| C3 | `/routing` bỏ một điểm mà `/routing/days` vừa xếp | P0 | C. Routing |
| C4 | Báo `no_time` sai khi ngày còn trống | P0 | C. Routing |
| C5 | Lý do `closed_on_trip_days` dùng cả khi điểm đang mở | P2 | C. Routing |
| C6 | Lỗi 422 theo dạng `problem+json`, bỏ trường `input` | P2 | C. Routing |
| C7 | Thêm `max_places_per_day` | P1 | C. Routing |
| C8 | Bữa ăn: khung giờ trưa / tối, bỏ luật cấm cà phê sau bữa ăn | P1 | C. Routing |
| C9 | `visit_minutes` theo từng điểm trong request | P1 | C. Routing |
| C10 | `keep_order` giữ đúng thứ tự người dùng đã sắp | P1 | C. Routing |
| C11 | Trả kèm hệ số tốc độ dùng để tính thời gian đi | P2 | C. Routing |
| D1 | Id điểm bị xoá khi nhập bộ mới: kế hoạch cho chuyến đã lưu | P1 | D. Khác |
| D2 | Chỉ mục `city`, cột mới trong `db/schema.sql` | P1 | D. Khác |
| D3 | Sửa chú thích và tài liệu đã cũ | P2 | D. Khác |
| D4 | Bổ sung test cho các thay đổi trên | P1 | D. Khác |

Thứ tự làm đề xuất: A1 và A2 trước (dữ liệu sai thì mọi thứ khác đo không đúng), rồi C1 đến C4 (lịch hợp lý), rồi A3, A4, C9, C10, C7, rồi nhóm B cùng A5.

---

## A. Dữ liệu

### A1. Nhập `places_hcm_verified.parquet` (P0)

**Vấn đề.** Database đang chứa bộ cũ (`data/places_1000.parquet`, 1.000 điểm). Bộ mới đã kiểm lại giờ mở cửa và loại các điểm không phải du lịch. Ví dụ Bảo tàng Chứng tích Chiến tranh: 07:30–17:30, không nghỉ trưa. Ghi chú: file trong `docs/backend-routing-issues.md` mục 9 nhắc tên cũ (`places_1000.parquet`, 898 điểm); file đúng cần nhập là `Journie-Data/places_1000/places_hcm_verified.parquet`.

**Đã kiểm với code.**

- File mới có 1.014 dòng, 69 cột, đúng thứ tự và tên cột của `data/places_100.parquet`, `taxonomy_version` đều là `journie-taxonomy/v1`. Chạy thử `scripts/import_parquet.py ... --dry-run` thành công, không lỗi taxonomy.
- Dry-run cảnh báo 1 điểm có giờ không đọc được, sẽ lưu thành "chưa rõ giờ": `monkee-shisha-house-a2745f` (`ingest.readable_hours`). Cần sửa giờ ở nguồn dữ liệu hoặc chấp nhận.
- So với bộ cũ: 387 id giữ nguyên, 627 id mới, 613 id cũ không còn trong file (xem D1).
- `scripts/import_parquet.py` upsert theo `id`; `--prune` (dòng 112–116) xoá mọi id không có trong file.

**Đề xuất.**

1. Nhập thử vào schema riêng:
   `uv run --group data python scripts/import_parquet.py <đường dẫn>/places_hcm_verified.parquet --schema retrieval_test --data-version hcm-verified-2026-11-19 --prune`
2. Chạy lại bộ test và `eval/run_eval.py` trên schema thử, so kết quả với bộ cũ.
3. Nhập vào schema chính với cùng lệnh (kèm `--prune`, vì bộ mới chủ ý bỏ các điểm cũ; không còn dùng cờ `recommendable=false` để ẩn điểm).

**Cách kiểm.**

```sql
SELECT count(*), count(*) FILTER (WHERE hours_contradicted) FROM pois;   -- 1014, 255
SELECT opening_hours_raw FROM pois WHERE name ILIKE '%Chứng tích Chiến tranh%';   -- 07:30–17:30
```

**Tiêu chí xong.** Bảng `pois` có 1.014 dòng, `max(data_version)` là `hcm-verified-2026-11-19`; `POST /retrieval` với `must_visit: ["Bảo tàng Chứng tích Chiến tranh"]` trả điểm có giờ 07:30–17:30.

### A2. Điểm `hours_contradicted` và điểm không có giờ trong routing (P0)

**Vấn đề.** Bộ mới có 255/1.014 điểm đánh dấu `hours_contradicted` (bộ cũ: 16/1.000) và 261 điểm chưa có giờ (`opening_hours_normalized` rỗng). Retrieval có xử lý: `hours.decide()` (dòng 138–149) chỉ loại điểm khi giờ đáng tin, còn điểm bị mâu thuẫn chỉ gắn cờ `hours_maybe_closed`. Routing thì không: `service.prepare()` dòng 205 đọc `poi.opening_hours` làm sự thật, `hours_contradicted` được tải vào `Poi` nhưng không dùng. Hậu quả: một điểm giờ đáng ngờ có thể bị báo `closed_on_trip_days` (bị bỏ khỏi lịch) hoặc bị xếp vào giờ mà nguồn khác nói là đóng cửa.

**Đề xuất.** Trong `prepare()`:

- Nếu `poi.hours_contradicted` và `windows()` ra rỗng: không bỏ điểm, coi như chưa rõ giờ (mở cả ngày, như nhánh `intervals is None` ở dòng 112–113).
- Mọi điểm `hours_contradicted` thêm cảnh báo mới `hours_contradicted:<id>` vào `warnings` (cạnh `hours_unknown:<id>` ở `outcome()` dòng 313–317), để frontend ghi "giờ mở cửa chưa chắc".
- Điểm không có giờ đã có `hours_unknown:<id>`; giữ nguyên.

**Cách kiểm.** Lấy một id có `hours_contradicted = true`, gọi `POST /routing` với `start_at`/`end_at` rơi vào ngày giờ ghi là đóng. Trước khi sửa: điểm vào `unscheduled` với `closed_on_trip_days`. Sau khi sửa: điểm có trong `days[].stops` và `warnings` chứa `hours_contradicted:<id>`.

**Tiêu chí xong.** Không điểm nào bị loại vì `closed_on_trip_days` khi `hours_contradicted` là true; cảnh báo xuất hiện; `docs/API.md` liệt kê mã cảnh báo mới trong `WARNINGS` (`app/schemas/routing.py` dòng ~131).

### A3. Cột `expected_visit_duration_min` (P1)

**Vấn đề.** File mới có cột này cho cả 1.014 điểm (25 đến 155 phút, không giá trị rỗng; 283 điểm khác với số theo loại). Backend không nhận cột: `db/schema.sql` không có cột, `ingest.prepare_row` (dòng 87–120) không đọc, `poi.POI_COLUMNS` / `Poi` không có, và `service.prepare()` dòng 204 chỉ dùng `VISIT_MINUTES.of(poi.category)`. (Cột đã có trong `data/places_1000.parquet` nhưng toàn rỗng.)

**Đề xuất.**

1. `db/schema.sql`: `ALTER TABLE pois ADD COLUMN IF NOT EXISTS expected_visit_duration_min integer;` (thêm cả vào `CREATE TABLE`).
2. `ingest.prepare_row`: `"expected_visit_duration_min": row.get("expected_visit_duration_min")`.
3. `poi.py`: thêm tên cột vào `POI_COLUMNS` và trường `expected_visit_duration_min: int | None = None` vào `Poi`.
4. `service.prepare()` dòng 204, thứ tự ưu tiên: `visit_minutes` do người dùng gửi (C9) > `poi.expected_visit_duration_min` > `VISIT_MINUTES.of(category)`.
5. `RoutingMeta`: thêm `visit_minutes_source` không bắt buộc (`"request"`, `"place"`, `"category"` chỉ để đối chiếu) hoặc ghi vào tài liệu; không bắt buộc.

**Cách kiểm.** Chọn một nhà hàng có `expected_visit_duration_min = 35`. `POST /routing` với điểm đó: `days[0].stops[0].visit_minutes` phải là 35 (hiện là 60).

**Tiêu chí xong.** `visit_minutes` trong `/routing` khớp cột của từng điểm; điểm không có cột dùng số theo loại; test mới trong `tests/test_routing_api.py`.

### A4. Thay `visit_minutes.yaml` (P1)

**Vấn đề.** `app/services/routing/config/visit_minutes.yaml` là bản tạm `visit-minutes-v0`, thiếu `food.street_food`, `food.food_court`, `attraction.viewpoint`, `attraction.zoo`, `culture_religion.mosque` (những loại này đang rơi về `default`).

**Đã kiểm với code.** `Journie-Data/places_1000/visit_minutes.v1.yaml` có `version: visit-minutes-v1`, `default: 40`, 25 loại (đủ toàn bộ loại trong `data/taxonomy.v1.yaml`, không loại lạ), mọi số là số nguyên dương nên qua `load_visit_minutes()` (`service.py` dòng 72–78). Khối `ranges` thừa nhưng bị bỏ qua vì hàm chỉ đọc `version`, `default`, `categories`. Căn cứ: `docs/visit-duration-basis.md` (phần lớn là ước lượng của nhóm, chưa phải số đo).

**Đề xuất.** Chép đè file. Không cần đổi code.

**Cách kiểm.** Khởi động server (nạp lỗi ngay lúc import nếu sai); `POST /routing` trả `meta.visit_minutes_version = "visit-minutes-v1"`.

**Tiêu chí xong.** `meta.visit_minutes_version` là `visit-minutes-v1`; `docs/API.md` dòng ~432 và ~485 cập nhật.

### A5. Cột `city`, `outside_region` theo thành phố, dữ liệu thành phố khác (P1)

**Vấn đề.** Toàn bộ 1.014 dòng có `city = 'Thành phố Hồ Chí Minh'` và `outside_region = false`. Cột `city` đã có (`db/schema.sql` dòng 25, `ingest.py` dòng 100) nhưng không câu lệnh SQL nào dùng. `outside_region` do pipeline dữ liệu tính theo một đa giác duy nhất là TP.HCM, nên một điểm ở Hà Nội sẽ bị đánh dấu "ngoài vùng". Chưa có điểm nào của Hà Nội, Đà Nẵng, Huế.

**Đề xuất.**

- Dữ liệu: mỗi thành phố có đa giác vùng riêng; `outside_region` tính theo thành phố của chính dòng đó (việc của nhóm dữ liệu, ghi ở đây để nhóm backend biết là điều kiện cần cho B2).
- Giá trị `city` chuẩn: `Thành phố Hà Nội`, `Thành phố Đà Nẵng`, `Thành phố Huế`, `Thành phố Hồ Chí Minh`.
- Thành phố thêm sau (ví dụ Đà Lạt, prompt trích xuất `prompt.py` dòng 26 đã chuẩn hoá tên này) chỉ cần thêm một dòng ở bảng ánh xạ (B1) khi có dữ liệu.

**Cách kiểm.** `SELECT city, count(*), count(*) FILTER (WHERE outside_region) FROM pois GROUP BY city;`

**Tiêu chí xong.** Mỗi thành phố được hỗ trợ có dữ liệu, và `outside_region` của thành phố đó gần 0 (chỉ điểm thật sự ngoài ranh giới).

---

## B. Nhiều thành phố

### B1. Retrieval nhận nhiều điểm đến (P1)

**Vấn đề.** `app/services/retrieval/service.py` dòng 27: `SUPPORTED_DESTINATION = "Ho Chi Minh City"`; dòng 108–113: điểm đến khác trả `status: "unsupported_destination"`, không có địa điểm nào. Trích xuất đã sẵn sàng: `prompt.py` dòng 26–27 chuẩn hoá về `Hanoi`, `Da Nang`, `Da Lat`, `Hue`; `name_aliases.csv` có alias; múi giờ `Asia/Ho_Chi_Minh` đúng cho cả nước.

**Đề xuất.** Thay hằng bằng bảng ánh xạ, đặt trong `retrieval/config.py` (hoặc cạnh `service.py`):

```python
CITY_BY_DESTINATION = {
    "Ho Chi Minh City": "Thành phố Hồ Chí Minh",
    "Hanoi": "Thành phố Hà Nội",
    "Da Nang": "Thành phố Đà Nẵng",
    "Hue": "Thành phố Huế",
}
DEFAULT_DESTINATION = "Ho Chi Minh City"
```

Trong `retrieve()`: `destination = extraction.destination or DEFAULT_DESTINATION`; nếu không có trong bảng thì trả `unsupported_destination` như cũ; nếu có thì `city = CITY_BY_DESTINATION[destination]` truyền xuống B2 và B3. Giữ hành vi cũ khi `destination` là `None` (dùng HCMC, kèm cảnh báo, xem B5). Chỉ thêm một thành phố vào bảng khi bảng `pois` đã có dữ liệu của nó, nếu không retrieval trả `ok` với 0 địa điểm, gây hiểu nhầm.

**Cách kiểm.**

```
POST /retrieval {"extraction": {"destination": "Hanoi", "interests": ["cafe"], ...}}
```

Hiện: `status = unsupported_destination`. Sau khi sửa (và có dữ liệu Hà Nội): `status = ok`, mọi `items[].lat/lon` nằm trong Hà Nội.

**Tiêu chí xong.** Bốn điểm đến trên chạy được; một điểm đến không có trong bảng (ví dụ `Paris`) vẫn trả `unsupported_destination`; sửa `tests/test_retrieval_api.py::test_statuses_that_need_no_query` (đang dùng `Hanoi` làm ví dụ không hỗ trợ).

### B2. Lọc catalogue theo `city` (P1)

**Vấn đề.** `candidates.ELIGIBLE` (dòng 35–39) chỉ là `recommendable AND NOT outside_region AND ...`. Nó dùng trong `fetch_pois` (dòng 62–63), `STRUCTURED_SQL` (80–84) và `TEXT_SQL` (90–99). Khi trong bảng có nhiều thành phố, gợi ý cho Hà Nội sẽ trộn điểm của TP.HCM.

**Đề xuất.**

- `ELIGIBLE`: thêm `AND city = %(city)s`.
- `eligibility(avoid, avoid_ids)` (dòng 43–48) nhận thêm `city` và đưa vào dict tham số.
- `retrieve()` dòng 161: `candidates.eligibility(plan.avoid, avoid_ids, city)`.

**Cách kiểm.** Với bảng có cả hai thành phố, gọi `/retrieval` cho `Hanoi` rồi `Ho Chi Minh City` với cùng `interests`; hai tập `id` không giao nhau, và mọi `id` thuộc đúng `city` (kiểm bằng SQL).

**Tiêu chí xong.** Không có điểm nào của thành phố khác xuất hiện trong `sections`, `pinned`, `disambiguation`.

### B3. Lọc `names.lookup` và `exact_ids` theo `city` (P1)

**Vấn đề.** `names.LOOKUP_SQL` (dòng 66–78) chỉ lọc `p.recommendable`; `EXACT_SQL` (103–107) không lọc gì. Hai câu này dùng cho `must_visit`, `preferred_places`, `avoid`. Hai hậu quả: (1) khi có nhiều thành phố, "Chợ Bến Thành" hay tên trùng (ví dụ "Highlands Coffee") có thể khớp điểm của thành phố khác; (2) ngay cả với một thành phố, hai câu này không loại `outside_region`, nên điểm ngoài vùng vẫn có thể thành `pinned`, trái với B2.

**Đề xuất.** `names.lookup(conn, query, city)` và `exact_ids(conn, query, city)`: thêm `AND p.city = %(city)s AND NOT p.outside_region` (và `AND city = ... ` cho `EXACT_SQL`); `retrieve()` dòng 140 và 143 truyền `city`.

**Cách kiểm.** Hai thành phố cùng có điểm tên "Highlands Coffee". `must_visit: ["Highlands Coffee"]` với `destination: "Hanoi"` chỉ trả `pinned`/`disambiguation` của Hà Nội.

**Tiêu chí xong.** Không có kết quả của thành phố khác; test mới trong `tests/test_retrieval_names_interests.py` hoặc `tests/integration`.

### B4. Thêm `city` vào `PoiCard` (P1)

**Vấn đề.** `PoiCard` (`app/schemas/retrieval.py` dòng 63–78) và `sections.to_card()` (dòng 410–429) không có `city`; `POI_COLUMNS` cũng không chọn cột này. Frontend hiện suy ra thành phố từ toạ độ (tâm gần nhất); nó đã sẵn sàng đọc `city` khi có.

**Đề xuất.**

- `poi.POI_COLUMNS` và `Poi`: thêm `city`.
- `PoiCard`: `city: str | None = None` (có giá trị mặc định, vì `/routing` nhận lại cả card do client gửi; thiếu trường này không được làm request cũ bị 422).
- `to_card`: `city=poi.city`.

**Cách kiểm.** `POST /retrieval` rồi xem `sections[].items[].city`; gửi lại một card không có `city` vào `POST /routing` vẫn 200.

**Tiêu chí xong.** Mọi card trả về có `city`; request cũ không có trường này vẫn hợp lệ.

### B5. Câu cảnh báo nêu đúng tên thành phố (P2)

**Vấn đề.** Ba chỗ ghi cứng "TP.HCM": `service.py` dòng 112 ("hiện chỉ có dữ liệu TP.HCM"), dòng 116 ("đang gợi ý địa điểm tại TP.HCM"), và `sections.py` dòng 193 ("Không có dữ liệu cho “…” tại TP.HCM").

**Đề xuất.** Dùng tên hiển thị của thành phố đang xét (thêm vào bảng B1, ví dụ `"Ho Chi Minh City": ("Thành phố Hồ Chí Minh", "TP.HCM")`). Câu `unsupported_destination` liệt kê các thành phố đang hỗ trợ. `build_specs()` cần nhận tên thành phố (hoặc trả mã cảnh báo để `retrieve()` ghép chữ).

**Tiêu chí xong.** Gọi cho Đà Nẵng, mọi cảnh báo nhắc "Đà Nẵng", không còn chữ "TP.HCM".

### B6. `--prune` chỉ xoá trong thành phố của file (P1)

**Vấn đề.** `scripts/import_parquet.py` dòng 112–116: `DELETE FROM pois WHERE NOT (id = ANY(%s))`. Khi nhập file Hà Nội với `--prune`, toàn bộ điểm TP.HCM bị xoá.

**Đề xuất.** Thêm tuỳ chọn `--city <tên city>`; khi có `--prune`, câu xoá thành `DELETE FROM pois WHERE city = %s AND NOT (id = ANY(%s))`. Nếu không có `--city` mà file có nhiều hơn một giá trị `city`, báo lỗi. `data_version` cũng nên đặt riêng từng thành phố (xem D2: `DATA_INFO_SQL` lấy `max(data_version)` theo chuỗi).

**Cách kiểm.** Nhập file Hà Nội với `--prune --city "Thành phố Hà Nội"`; `SELECT count(*) FROM pois WHERE city = 'Thành phố Hồ Chí Minh'` không đổi.

**Tiêu chí xong.** Nhập từng thành phố độc lập, không xoá nhầm.

---

## C. Routing

Các số liệu thử ở dưới lấy từ `docs/backend-routing-issues.md` (backend chạy ở máy, không có `OSRM_URL`, nên mọi kết quả là `travel_estimated`).

### C1. Lịch có chỗ chờ hàng giờ (P0)

**Vấn đề.** `POST /routing`, 12 điểm, 21–22/11/2026: điểm cuối ngày 1 (một quán bar) đến lúc 12:48, mở lúc 19:00, `wait_minutes` = 372. Các lần khác: chờ 172 phút (16 điểm, 2 ngày), 127 (24 điểm, 3 ngày), 171 + 166 + 165 + 120 (50 điểm, 7 ngày).

**Đã kiểm với code.** `service.plan_cost()` (dòng 252–269) trả `(luật bị vi phạm, điểm cân bằng vượt ngưỡng, tổng giây di chuyển)`; thời gian chờ không có trong bộ ba này. `busy_seconds()` (dòng 246–249) cũng chỉ cộng di chuyển và thời gian tham quan, không cộng chờ, nên `busy_minutes` của `/routing/days` thấp hơn thực tế. Bước chèn trong `ils._best_position` (dòng 78) có tính chờ vào `shift`, nhưng bước `ils.rebalance()` (dòng 228–249) chỉ so `cost`, nên có thể dời một điểm mở muộn lên đầu ngày mà không bị phạt.

**Đề xuất.**

- `plan_cost()`: thêm tổng thời gian chờ vào thành phần cuối: `(broken, beyond, total_travel + total_wait)`; muốn nặng hơn thì đặt hệ số lớn hơn 1 cho chờ. Tính `wait` bằng cách mô phỏng từng ngày như `validate.tour_errors` (đã có `start - arrive`).
- `busy_seconds()`: cộng thời gian chờ vào giá trị thứ hai (travel + visits + wait) để `busy_minutes` khớp lịch thật.
- Phương án bổ sung: giới hạn chờ mỗi điểm (ví dụ 60 phút); nếu vượt, thử dời điểm sang vị trí khác trong ngày hoặc ngày khác (`_moves` đã có).

**Cách kiểm.** Gọi lại đúng request ở trên (12 điểm gồm một bar, 21–22/11/2026, mọi điểm ghim theo `/routing/days`). Kiểm: `max(stop.wait_minutes)` của mọi stop.

**Tiêu chí xong.** Không stop nào chờ quá 60 phút khi có cách xếp khác; `busy_minutes` ở `/routing/days` bằng tổng (tham quan + di chuyển + chờ) của `/routing`.

### C2. Chuyến dài ít điểm bỏ trống nguyên ngày (P0)

**Vấn đề.** `POST /routing/days`, ngày 08:00–21:00, không ghim:

- 7 ngày, 12 điểm: `[2,3,2,3,2,0,0]`
- 10 ngày, 20 điểm: `[5,5,4,4,1,1,0,0,0,0]`
- 14 ngày, 50 điểm: `[5,11,10,10,10,4,0,0,0,0,0,0,0,0]` (hai ngày đầy 707/780 và 708/780 phút trong khi 8 ngày trống)

Không có cảnh báo.

**Đã kiểm với code.** `plan_cost()` dòng 264–266 đo độ cân bằng bằng `max(loads) - min(loads)`. Giá trị này phẳng: dời một điểm từ ngày đầy nhất sang ngày trống không làm `max - min` giảm nếu còn một ngày khác cũng đầy (ví dụ ba ngày đầy 10, 10, 10 và bốn ngày trống). `ils.rebalance()` chỉ nhận nước đi khi `value < best` (dòng 246), nên kẹt ở điểm dừng.

**Đề xuất.**

- Thay độ cân bằng bằng đại lượng nhạy với từng ngày: tổng bình phương tải mỗi ngày (`sum(l * l for l in loads)`), hoặc xếp tải giảm dần rồi so từng phần tử (lexicographic). Giữ `balance_tolerance` (`rules.yaml`) nếu muốn: chỉ phạt phần vượt.
- Thêm cảnh báo `empty_days:<n>` khi có ngày không có điểm nào mà chuyến còn ngày đủ giờ, để frontend báo "chuyến dài hơn số điểm đã chọn".

**Cách kiểm.** Lặp lại ba request trên.

**Tiêu chí xong.** Với 12 điểm trên 7 ngày: không ngày nào có hơn 3 điểm trừ khi có luật hoặc giờ mở cửa buộc; với 50 điểm trên 14 ngày: ngày đầy nhất không quá khoảng 1,5 lần ngày trung bình.

### C3. `/routing` bỏ một điểm mà `/routing/days` vừa xếp (P0)

**Vấn đề.** Gọi `/routing/days` không ghim, rồi `/routing` với đúng các điểm đó, ghim theo ngày vừa nhận (frontend làm đúng như vậy). 5 trên 36 lần có điểm bị `no_time`: 2 ngày 45 điểm (tải 779/780 và 779/780) mất `oc-van-798627`; 3 ngày 50 điểm mất `terroir-wine-bar-36dddd` và `luong-ky-mi-gia-df1954`. Nút "Tạo lịch trình" khi đó không hoàn tất.

**Đã kiểm với code.** Cả hai endpoint gọi cùng `solve()` (`service.py` dòng 272–297). `ils.solve()` (dòng 132–181) luôn bắt đầu từ các tour rỗng và chèn tham lam theo `score² / shift` (dòng 99), không dùng thứ tự client gửi. Với ngày đã gần đầy (779/780), một thứ tự chèn khác đủ làm một điểm không còn chỗ. Tìm kiếm cũng dừng sau 1 giây không cải thiện (`STALL_S`, dòng 58).

**Đề xuất.** Cho `ils.solve()` nhận tour khởi đầu (`initial: Tours | None`):

1. Trong `service.solve()`, dựng tour khởi đầu từ thứ tự các điểm trong `request.places`, nhóm theo `pins`.
2. Với mỗi ngày, kiểm bằng `validate.tour_errors`; ngày nào khả thi thì giữ nguyên làm lời giải đầu, ngày nào không thì bỏ các điểm vi phạm khỏi tour (để bước chèn thử lại).
3. Chỉ sau đó mới chạy ILS và `rebalance` để cải thiện (chỉ chấp nhận khi điểm không giảm).

**Cách kiểm.** Kịch bản lặp: `/routing/days` (không ghim) rồi `/routing` (ghim theo kết quả), lặp 36 lần với 2–3 ngày và 45–50 điểm.

**Tiêu chí xong.** 0/36 lần có `no_time` do bước thứ hai; ngày đã xếp ở `/routing/days` luôn xếp được ở `/routing`.

### C4. Báo `no_time` sai khi ngày còn trống (P0)

**Vấn đề.** `POST /routing`, 15 điểm, 27–28/11/2026 (thứ Sáu, thứ Bảy), không ghim. Hai điểm bị `no_time`: `bao-tang-luc-luong-vu-trang-mien-dong-na-af47f7` và `giga-mall-pham-van-dong-39f7b3`. Trong khi thứ Sáu trống từ 12:27 đến 17:00 (chờ 268 phút) và tải hai ngày chỉ 418 và 457 trên 780 phút. Ghim hai điểm này vào thứ Sáu thì xếp được hết.

**Đã kiểm với code.** `ils.rebalance()` (dòng 228–249) chỉ di chuyển, hoán đổi điểm đã được xếp, không bao giờ chèn điểm còn thiếu (docstring: "no visit is ever dropped"). Nếu ILS (dừng sau 1 giây không cải thiện) để sót một điểm, `outcome()` (dòng 300–307) đánh dấu `no_time` mà không thử lại sau khi `rebalance` đã mở chỗ trống.

**Đề xuất.** Trong `service.solve()`, sau `rebalance`:

1. Với mỗi điểm chưa xếp, thử `ils._placed()` vào mọi ngày (ưu tiên điểm có ít khung giờ mở trước).
2. Nếu có điểm chèn được thì chạy `rebalance` lần nữa; lặp đến khi không thêm được.
3. Đặt `STALL_S` hợp lý hoặc để vòng này chạy trong ngân sách thời gian còn lại.

**Cách kiểm.** Request trên. Kiểm `unscheduled` rỗng.

**Tiêu chí xong.** Không có `no_time` khi tồn tại một ngày khác chèn được (kiểm bằng thử chèn vét cạn trong test).

### C5. Lý do `closed_on_trip_days` dùng cả khi điểm đang mở (P2)

**Vấn đề.** Ngày 12:00–12:30 với 10 điểm ở trung tâm: cả 10 điểm trả `closed_on_trip_days`, kể cả Chợ Bến Thành (mở 00:00–22:00). Điểm vẫn mở, chỉ là khung ngày ngắn hơn thời gian tham quan.

**Đã kiểm với code.** `windows()` (dòng 103–127) tính `last = min(stop, end) - service` và bỏ khung nếu `last < first`; `prepare()` dòng 210–213 thấy `slots` rỗng thì gán `closed_on_trip_days`/`closed_on_pinned_day` mà không phân biệt nguyên nhân.

**Đề xuất.** Khi `slots` rỗng, tính lại `windows(poi.opening_hours, 0, bounds, ...)` (thời lượng 0). Nếu kết quả không rỗng: điểm có mở, chỉ thiếu thời gian, trả `no_time`. Nếu vẫn rỗng: `closed_on_trip_days` (hoặc `closed_on_pinned_day`). Cập nhật `UnscheduledReason` mô tả trong `schemas/routing.py` dòng 108–118 (mô tả của `closed_on_trip_days` đang là "không có khung mở đủ dài cho chuyến thăm", cần nói rõ là "đóng cửa cả chuyến").

**Cách kiểm.** `start_at` 12:00, `end_at` 12:30, `places` gồm Chợ Bến Thành. Kỳ vọng `reason = "no_time"`.

**Tiêu chí xong.** Chỉ điểm thật sự đóng cửa mới nhận `closed_on_*`. Frontend giữ cách ghi hiện tại ("không có khung mở đủ dài trong giờ bạn chọn") cho `no_time` khi cần.

### C6. Lỗi 422 theo dạng `problem+json`, bỏ trường `input` (P2)

**Vấn đề.** Lỗi kiểm tra dữ liệu vào trả dạng mặc định của FastAPI: `{"detail": [{"type": "value_error", "msg": "...", "input": {...toàn bộ request...}}]}`. Các lỗi khác đã là `application/problem+json` (`app/core/errors.py`). Trường `input` chép lại cả request (danh sách điểm, vị trí xuất phát), lặp dữ liệu người dùng vào log và vào phản hồi.

**Đã kiểm với code.** `register_error_handlers()` (`errors.py` dòng 64–65) chỉ đăng ký `ProblemError`; không có handler cho `RequestValidationError`. `docs/API.md` dòng 513 ghi rõ 422 đang theo dạng mặc định.

**Đề xuất.** Đăng ký handler cho `fastapi.exceptions.RequestValidationError`, trả:

```json
{"type": "/problems/validation-error", "title": "Invalid request", "status": 422,
 "detail": "places: List should have at most 50 items", "instance": "/routing",
 "errors": [{"loc": ["body", "places"], "msg": "List should have at most 50 items"}]}
```

với `Content-Type: application/problem+json`; không đưa `input` và `ctx`.

**Cách kiểm.** `POST /routing` với `places: []`. Kiểm header `content-type` và body không có `input`.

**Tiêu chí xong.** Mọi 422 là problem+json; cập nhật các test dùng `response.text` (`tests/test_routing_days.py` dòng 130, `tests/test_routing_api.py` dòng 301) và `docs/API.md` dòng 513.

### C7. `max_places_per_day` (P1)

**Vấn đề.** Người dùng chọn "Tối đa 6 điểm mỗi ngày" nhưng `/routing/days` vẫn xếp 7 điểm. `RoutingRequest` (`app/schemas/routing.py` dòng 24–52) không có trường nào cho việc này.

**Đề xuất.**

- `RoutingRequest.max_places_per_day: int | None = Field(default=None, ge=1, le=MAX_PLACES)`.
- `Instance` (`instance.py`): thêm `max_stops: int | None = None`.
- `ils._best_position` (dòng 63) bỏ qua tour đã đủ `max_stops`; `ils._moves` / `_placed` / `_built` (184–225) không tạo tour vượt giới hạn; `validate.tour_errors` thêm lỗi `len(tour) > max_stops` để `solve()` (dòng 289) không trả lịch vi phạm.
- Điểm không xếp được vì giới hạn: `no_time` (kèm cảnh báo `max_places_per_day` nếu muốn phân biệt).

**Cách kiểm.** 2 ngày, 12 điểm gần nhau, `max_places_per_day: 6`: `/routing/days` trả `len(days[i].places) <= 6`. Với 14 điểm (nhiều hơn 12 chỗ): 2 điểm vào `unscheduled`.

**Tiêu chí xong.** Không ngày nào vượt giới hạn; không có giới hạn (`null`) thì hành vi như cũ; test mới.

### C8. Bữa ăn: khung giờ và luật liền kề (P1)

**Vấn đề.** Với khung 08:00–21:00, ngày thường kết thúc lúc 13:00–14:40. Có ngày hai bữa trưa liền nhau, cảnh báo `not_adjacent:food` ở mọi ngày, và không ngày nào có bữa tối.

**Đã kiểm với code.**

- Không có khái niệm giờ ăn: `service.prepare()` chỉ dùng giờ mở cửa của điểm. Bước chèn `ils._insert` chọn vị trí có `shift` nhỏ nhất, nên mọi thứ dồn về buổi sáng khi còn chỗ.
- `config/rules.yaml` dòng 12–13: `not_adjacent: [food]` bao trùm cả `food.cafe` và `food.street_food` (`RULES.tag()`, `rules.py` dòng 23–25), nên một ly cà phê ngay sau bữa trưa cũng bị tính là phạm luật. Đó có thể là nguyên nhân của cảnh báo `not_adjacent:food` thường xuyên.

**Đề xuất.**

1. Thêm mục `meal_windows` vào `rules.yaml`, ví dụ `food.restaurant: [["11:00","13:30"], ["18:00","20:00"]]`. Trong `prepare()`, cắt các khung giờ của điểm ăn với khung này (`windows()` kết quả giao với giờ ăn). Nếu giao nhau rỗng thì giữ khung cũ và thêm cảnh báo `meal_time_ignored:<id>`, để một quán chỉ mở lúc 15:00 không bị loại.
2. Đổi `not_adjacent` thành `food.restaurant` (hoặc `[food.restaurant, food.street_food]`), cho phép cà phê đi liền sau bữa ăn.
3. Bước 1 sẽ tự tách điểm ăn ra trưa / tối, nên mỗi ngày hợp lý có tối đa hai bữa; thêm `day_max: food.restaurant: 2` nếu cần chặn trường hợp ba bữa.
4. Tăng `version` của `rules.yaml` lên `rules-v2` (đã có `meta.rules_version`).

**Cách kiểm.** 6 nhà hàng + 6 điểm tham quan, 2 ngày, 08:00–21:00. Kỳ vọng: mỗi ngày có tối đa 1 nhà hàng bắt đầu trong 11:00–13:30 và tối đa 1 trong 18:00–20:00; không cảnh báo `not_adjacent:food` khi chỉ có cà phê sau bữa ăn.

**Tiêu chí xong.** Không còn hai bữa trưa liền nhau khi có thể tránh; có ngày kết thúc buổi tối khi chuyến có nhà hàng thừa; `rules_version = "rules-v2"`.

### C9. `visit_minutes` theo từng điểm trong request (P1)

**Vấn đề.** `/routing` không nhận thời lượng người dùng đặt (extraction đã có atom `visit_duration_min`, ví dụ `Vườn Mây:55`, `prompt.py` dòng 40, 111–113). Mỗi lần "Xếp lại lịch" thời lượng trở về mặc định theo loại, nên chỉnh sửa của người dùng bị mất. Frontend hiện chỉ cảnh báo và cho Hoàn tác.

**Đã kiểm với code.** `service.prepare()` dòng 204: `service = VISIT_MINUTES.of(poi.category) * 60`; `PoiCard` được mô tả là "returned as sent, only `id` is read" (`schemas/routing.py` dòng 29–31), nên không thể nhét thời lượng vào card.

**Đề xuất.** `RoutingRequest.visit_minutes: dict[str, int] = Field(default_factory=dict)`, khoá là id trong `places`, giá trị 5–480 (kiểm trong `consistent()`, dòng 63–84: khoá phải thuộc `places`). Trong `prepare()`: `minutes = request.visit_minutes.get(card.id) or poi.expected_visit_duration_min or VISIT_MINUTES.of(poi.category)` (xem A3). Trả `visit_minutes` thực dùng ở `Stop.visit_minutes` như hiện nay.

**Cách kiểm.**

```json
POST /routing {"places": [...], "visit_minutes": {"<id>": 120}, ...}
```

`days[].stops[].visit_minutes` của `<id>` là 120; `/routing/days` cho cùng `busy_minutes` tương ứng.

**Tiêu chí xong.** Hai endpoint cùng tôn trọng `visit_minutes`; id lạ trong `visit_minutes` trả 422; mô tả trường trong OpenAPI và `docs/API.md`.

### C10. `keep_order` giữ đúng thứ tự người dùng đã sắp (P1)

**Vấn đề.** Khi mọi điểm đã ghim, backend vẫn tự sắp lại thứ tự cả ngày (liên quan C3). Frontend phải né bằng cách giữ nguyên các ngày không đổi, nếu không thứ tự người dùng kéo thả bị đảo.

**Đã kiểm với code.** `solve()` (dòng 272–297) luôn chạy ILS + `rebalance` kể cả khi mọi điểm đã ghim; `schemas/routing.py` dòng 49–51 viết rõ "Pin every place to keep the traveller's own split and only order each day" (chỉ giữ ngày, không giữ thứ tự).

**Đề xuất.** `RoutingRequest.keep_order: bool = False`. Khi `true`, với mỗi ngày mà mọi điểm của ngày đó đều ghim: thứ tự trong ngày chính là thứ tự xuất hiện trong `places`; bỏ qua ILS và `rebalance` cho ngày đó, chỉ mô phỏng giờ (đã có ở `plan()`, dòng 349–369). Điểm vi phạm khung giờ mở cửa hoặc quá `day_end` thì dời vào `unscheduled` với `no_time` và thêm cảnh báo `order_not_kept:<date>`; các điểm còn lại giữ nguyên thứ tự.

**Cách kiểm.** Ghim mọi điểm, gửi `places` theo thứ tự Z-A-M; kiểm `days[0].stops` đúng thứ tự gửi, `warnings` không có `order_not_kept` nếu khả thi.

**Tiêu chí xong.** Với `keep_order: true` và lịch khả thi, thứ tự trả về trùng thứ tự gửi 100% (kiểm lặp 20 lần); lịch không khả thi cho biết điểm nào bị bỏ và lý do.

### C11. Hệ số tốc độ dùng để tính thời gian đi (P2)

**Vấn đề.** Ước lượng thời gian đi ở frontend và backend lệch khoảng 2 phút mỗi chặng với taxi và đi bộ; frontend đã chỉnh cho xe máy theo cách backend ước lượng, nhưng chỉ cho một phương tiện.

**Đã kiểm với code.** `service.py` dòng 55–57: `WALK_THRESHOLD_KM = 1.0`, `WALK_KMH, RIDE_KMH = 4.5, 20.0`, `DETOUR_FACTOR = 1.3`; `leg_seconds()` (130–131) và `leg()` (134–136). `RoutingMeta` (`schemas/routing.py` dòng 122–128) không trả các số này.

**Đề xuất.** Thêm vào `RoutingMeta`: `walk_kmh`, `ride_kmh`, `walk_threshold_km`, `detour_factor` (số thật đã dùng). Frontend tính xấp xỉ theo các số này cho phương tiện khác (taxi, xe buýt) thay vì chép số.

**Tiêu chí xong.** Phản hồi có bốn trường mới; `docs/API.md` mô tả.

---

## D. Khác

### D1. Id điểm bị xoá khi nhập bộ mới (P1)

**Vấn đề.** So với bộ đang chạy, 613 id cũ không còn trong `places_hcm_verified.parquet`. `fetch_by_ids` (`candidates.py` dòng 70–77) sẽ không tìm thấy các id đó nên `/routing` trả `not_found` (`service.py` dòng 200–202) cho chuyến người dùng đã lưu từ trước. Frontend đã dùng id làm khoá giữa các phiên.

**Đề xuất.** Quyết định trước khi nhập (A1): (a) xuất danh sách id đã bị bỏ kèm lý do để nhóm frontend xử lý chuyến đã lưu; hoặc (b) chấp nhận mất các chuyến cũ, ghi vào ghi chú phát hành. Không cần code backend; chỉ cần quyết định và thông báo. Gợi ý: `SELECT id FROM pois WHERE data_version <> 'hcm-verified-2026-11-19'` chạy trước khi `--prune`.

**Tiêu chí xong.** Có danh sách id bị bỏ và thông báo cho frontend trước khi chạy `--prune` trên môi trường chính.

### D2. Chỉ mục `city` và cột mới trong `db/schema.sql` (P1)

**Vấn đề.** Sau B2 và B3, mọi truy vấn lọc theo `city` nhưng `db/schema.sql` không có chỉ mục cho cột này. `DATA_INFO_SQL` (`candidates.py` dòng 133–135) dùng `max(data_version)` theo chuỗi trên toàn bảng; khi mỗi thành phố nhập vào một ngày khác nhau, giá trị này không còn đại diện cho thành phố đang xét.

**Đề xuất.** Thêm vào `db/schema.sql` (idempotent như hiện nay): `CREATE INDEX IF NOT EXISTS pois_city_idx ON pois (city);` và (A3) `ALTER TABLE pois ADD COLUMN IF NOT EXISTS expected_visit_duration_min integer;`. `data_version` trong `meta` nên là phiên bản của thành phố đang xét: `SELECT max(data_version) FROM pois WHERE city = %s`.

**Tiêu chí xong.** `EXPLAIN` của truy vấn lọc `city` dùng chỉ mục khi bảng đủ lớn; `meta.data_version` đúng thành phố.

### D3. Chú thích và tài liệu đã cũ (P2)

- `app/schemas/routing.py` dòng 19: "every place is in Ho Chi Minh City" (`TRIP_TZ` đúng cho cả nước, chỉ cần sửa chú thích).
- `docs/API.md` dòng 432 ghi `visit-minutes-v0`, dòng 513 ghi 422 theo dạng mặc định; `README`/`docs/API.md` cần nhắc các trường mới (`city`, `max_places_per_day`, `visit_minutes`, `keep_order`, mã cảnh báo mới).
- `routing.py` (route) dòng 39 ghi "Visit durations are per category (placeholder values)" cần sửa khi A3 và A4 xong.
- `retrieval/candidates.py` dòng 23–26: chú thích về `MIN_CONFIDENCE = 0.7` đo trên `places_1000` (số 12 và 69 điểm), cần đo lại trên bộ mới (A1) vì phân bố `confidence` thay đổi.

### D4. Test cho các thay đổi trên (P1)

Mỗi mục ở trên cần ít nhất một test; gợi ý chỗ đặt:

- C1, C2, C3, C4: `tests/test_routing_ils.py` và `tests/test_routing_days.py` (dùng instance nhỏ dựng tay; C3 và C4 có thể viết thành thử "mọi điểm vừa xếp ở `/routing/days` phải xếp được ở `/routing`" trên 3 bộ dữ liệu ngẫu nhiên cố định).
- C5 đến C11: `tests/test_routing_api.py`.
- A2, A3: `tests/test_retrieval_ingest.py` (đọc cột mới) và `tests/test_routing_api.py`.
- B1 đến B5: `tests/test_retrieval_api.py`, `tests/test_retrieval_names_interests.py`.
- Mở rộng `bench/routing/` để in tổng thời gian chờ và số ngày trống, nhằm so sánh trước và sau C1 và C2.

**Tiêu chí xong.** `uv run pytest` xanh; benchmark không tệ đi về số điểm xếp được.
