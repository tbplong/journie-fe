# Backend còn thiếu theo từng use case (Journie)

Gửi nhóm backend (repo `journie-be`). Tài liệu đối chiếu bộ use case `Journie_Usecases` (Module 1 đến 7) với code backend và với những gì frontend **đã gọi sẵn**.

- Backend kiểm trên commit `d646272` (18/11/2026), chỉ đọc, không sửa.
- Frontend kiểm trên bản hiện tại của `journie-fe-main` (20/11/2026). Mọi `file:dòng` phía frontend là của bản này.
- Mục 4 "Hợp đồng API frontend đã gọi sẵn" là nguồn chính: backend làm đúng method, path, tên trường ở đó thì frontend gọi được ngay. Những chỗ frontend còn phải sửa trước khi chạy với backend thật ghi ở mục 0.1.
- Mục 5 là kết quả kiểm lại 26 lỗi backend đợt trước (chi tiết gốc: `docs/backend-change-requests.md`, `docs/backend-routing-issues.md`). Số liệu trong `docs/backend-change-requests.md` đã cũ sau khi bộ dữ liệu cập nhật tối 19/11: A1 ghi 1.014 điểm (nay 1.254), D1 ghi 613 id (nay 590). Dùng số ở mục 5 của tài liệu này.

## 0. Quy ước chung frontend đang dùng

| Việc | Frontend làm gì | Backend cần |
|---|---|---|
| Địa chỉ | Gọi `${VITE_API_URL}${path}`. Khi chạy local, `VITE_API_URL=/api` và Vite chuyển tiếp sang `:8000` (`vite.config.ts:10-14`). | Giữ path đúng như mục 4, không thêm tiền tố. |
| Xác thực | Sau khi đăng nhập, mọi request gửi `Authorization: Bearer <token>` (`src/api/http.ts:71`). Gặp **401** ở route ngoài `/auth/*`, có token hay không, thì tự đăng xuất một lần và đưa về `/login` kèm dòng "Phiên đăng nhập đã hết" (`http.ts:83`, `src/store/authStore.ts:111-114`); `/auth/*` không tính vì sai mật khẩu và đăng xuất cũng trả 401. | Token sai, hết hạn, **tài khoản bị khoá** thì trả 401. **Sai mật khẩu hiện tại** ở `/me/password`, `/me/email` thì KHÔNG trả 401 (dùng 400/403/422 + slug `invalid_credentials`), nếu không người dùng bị đăng xuất. Route công khai (mục 3.0) không trả 401 dù header `Authorization` hỏng. |
| Lỗi | Đọc `application/problem+json`, lấy phần cuối của `type` làm mã (slug), ví dụ `.../set-name-taken` → `set-name-taken` (`http.ts:31-44`). | Mọi lỗi nghiệp vụ trả problem+json có `type`. Hiện backend chỉ đăng ký handler cho `ProblemError` (`app/core/errors.py:65`); `HTTPException` mặc định của FastAPI trả `{"detail": ...}` không có `type`. |
| **Quy tắc dự phòng** | `remoteOr` (`http.ts:114-124`): route trả **404 hoặc 405 không có slug** thì frontend chuyển cả nhóm tính năng sang lưu trên trình duyệt **cho tới hết phiên**, bất cứ lúc nào. Khi không có phản hồi (status 0, hết giờ, 502-504) thì chỉ chuyển nếu **backend chưa trả lời lần nào** trong phiên: "đã trả lời" là có một phản hồi JSON hoặc 204; 502-504 của cổng hay trang HTML của host không tính (`http.ts:59,80`). Sau lần trả lời đầu, mất kết nối ở tính năng chưa nằm trên máy là lỗi báo cho người dùng, không chuyển sang máy. Mọi mã khác được coi là câu trả lời của server và báo lỗi. | Chỉ trả 404/405 "trần" cho route **chưa có** (khai báo path không có `/` cuối, ví dụ `@router.get("")`: qua proxy dev, redirect 307 của FastAPI trỏ sang `127.0.0.1:8000` và bị trình duyệt chặn). Không tìm thấy dữ liệu thật phải là 404 **có slug**. Chưa có dữ liệu (hồ sơ chưa lưu, chưa có link chia sẻ, danh sách rỗng) thì trả 200 với `{}`, `null`, `[]`, không 404. **Không trả 502/503/504 cho route CRUD mới**, kể cả có slug như `retrieval-db-unavailable` (`app/api/routes/retrieval.py:16-23`): nếu rơi vào lúc backend chưa trả lời lần nào trong phiên (khởi động lạnh, pool DB bận), frontend chuyển cả nhóm sang lưu trên máy tới hết phiên; với `trips`, `profile`, `account` giao diện không hiện dòng báo nào và những gì người dùng sửa sau đó không lên server. DB bận hoặc lỗi tạm thời: trả 500, hoặc 429 + `Retry-After`. |
| Phản hồi rỗng | Chấp nhận 204, hoặc 200/202 có thân rỗng, hoặc JSON (`http.ts:78-81`). | Route nào frontend "bỏ qua phản hồi" (ghi ở mục 4) thì trả gì cũng được. |
| Giới hạn tần suất | Đọc header `Retry-After` khi gặp 429 để đếm ngược (`http.ts:32`). | Trả 429 + `Retry-After`; khi chạy khác origin thì expose header này qua CORS. `Retry-After` là **số giây** (frontend đọc bằng `Number(...)`, không hiểu dạng ngày giờ). |
| Thời gian | Thời điểm: chuỗi ISO 8601. Bộ lọc ngày: `YYYY-MM-DD` theo ngày địa phương của người xem. Giờ trong ngày của chuyến đi: số phút từ 00:00. | Giữ đúng định dạng. `date_from`, `date_to` hiểu theo múi giờ Việt Nam và gồm cả ngày `date_to`. |
| Phân trang | `/admin/users`, `/business/employees`, các route lịch sử hoạt động gửi `page`, `page_size` và đọc `{items, total, page, pageSize}`. | Trả đúng tên `pageSize` (camelCase) trong thân, nhận `page_size` trên query. `page_size` frontend gửi: 10, 15 (lịch sử hoạt động), 200 (danh sách người nhận thông báo); cho phép tới 200. Thứ tự: mới tạo trước. |
| Kiểu tên trường | Chưa thống nhất: phần lớn thân gửi đi dùng snake_case (`poi_ids`, `antibot_token`, `current_password`, `company_name`), phần lớn phản hồi đọc camelCase (`avatarUrl`, `pageSize`, `createdAt`), riêng `/poi-sets` đọc snake_case và `/trips` đọc camelCase trừ 3 trường. | Làm đúng từng dòng ở mục 4. Muốn đổi về một kiểu thì xem câu hỏi mở ở mục 7. |
| CORS | Khi chạy local đi qua proxy nên không cần. | Khi triển khai khác origin: `CORSMiddleware` với danh sách origin cụ thể lấy từ cấu hình (domain production và domain preview nếu dùng, không dùng `*`), `allow_methods` = GET, POST, PUT, PATCH, DELETE, OPTIONS (mặc định của Starlette chỉ có GET), `allow_headers` = `Authorization`, `Content-Type`, `expose_headers` = `Retry-After`. Phản hồi lỗi, kể cả 500 do exception chưa bắt, cũng phải có header CORS; thiếu thì trình duyệt chặn và frontend coi như không có phản hồi (xem quy tắc dự phòng). Hiện `app/main.py` chưa có middleware CORS (thử `OPTIONS /routing` trả 405). |
| Thời gian chờ | Route CRUD: 12 giây (`http.ts:101`); `/routing`, `/routing/days`: 20 giây (`src/api/routing.ts:35`); `/chat`, `/retrieval`: 70 giây (`http.ts:28`). Quá hạn được coi như mất kết nối. | Route CRUD trả lời dưới 12 giây kể cả lúc khởi động lạnh và lúc pool DB bận (pool tối đa 3, chờ 10 giây rồi 503: `app/core/config.py:21-22`). |

## 0.1 Giới hạn đã biết phía frontend (không phải lỗi backend)

1. **Nơi chưa tải trên máy.** Chuyến, link chia sẻ và bộ sưu tập chỉ lưu id địa điểm. Frontend gọi `GET /pois?ids=` (xem 1.3 và 4.6) cho những id nó chưa biết. Khi route chưa có hoặc id vẫn lạ, nơi đó hiện "Địa điểm chưa tải được", bị bỏ khỏi bản đồ (số thứ tự các điểm dừng giữ nguyên), còn trang không lỗi. Chuyến lưu trên máy có nơi chưa tải cũng hiện như vậy, không còn bị ẩn. Trang `/s/:token` vẫn gọi `POST /retrieval` không có token để tải danh mục (`src/pages/SharedTripPage.tsx:33`).
2. Phiên đăng nhập tạo trên máy (tài khoản mẫu, tài khoản đăng ký khi chưa có `/auth/*`) không có token. Khi backend bật xác thực, request đầu tiên của phiên đó nhận 401, frontend đăng xuất về `/login` và người dùng đăng nhập lại bằng tài khoản thật.
3. Dữ liệu đã lưu trên máy (chuyến, bộ sưu tập, hồ sơ, tài khoản) không tự đẩy lên server khi route tương ứng có mặt, và id tài khoản trên máy (`u-…`) khác id của server.
4. Nhóm `auth` chuyển về máy khi backend **chưa trả lời lần nào** trong phiên mà gặp mất mạng, hết giờ hay 502-504 (xem quy tắc dự phòng ở mục 0): lúc đó đăng nhập thật báo "Email này chưa có tài khoản", còn đăng ký tạo tài khoản trên máy và lưu mật khẩu dạng thường trong localStorage (`src/api/auth.ts:49-50`, `src/api/accountStore.ts:8`). Sau lần trả lời đầu của backend thì không còn xảy ra.
5. Ba nút tài khoản mẫu vẫn hiện khi có backend (`src/pages/auth/LoginPage.tsx:321-341`) và không gửi `antibot_token`. Backend không tạo sẵn các tài khoản này.

## 1. Tóm tắt

Đếm theo danh sách use case trong 7 sơ đồ, mỗi use case một lần. UC 1.13 "Create new set" vẽ ở cả sơ đồ Module 1 và Module 2 (là con của 2.9), chỉ tính ở Module 1.

| Module | Số UC | Backend có | Backend một phần | Backend thiếu | Không cần backend | Frontend xong | Frontend một phần | Frontend chưa làm |
|---|---|---|---|---|---|---|---|---|
| 1. Gợi ý địa điểm và bộ sưu tập | 16 | 2 | 5 | 9 | 0 | 16 | 0 | 0 |
| 2. Quản lý lịch trình | 22 | 3 | 6 | 12 | 1 (2.22) | 19 | 3 (2.10, 2.16, 2.17) | 0 |
| 3. Theo dõi chuyến, sự cố, thích ứng | 9 | 0 | 0 | 8 | 1 (3.2) | 7 | 2 (3.5, 3.6) | 0 |
| 4. Dashboard và dữ liệu | 8 | 0 | 0 | 8 | 0 | 8 | 0 | 0 |
| 5. Tài khoản và người dùng | 18 | 0 | 0 | 17 | 1 (5.2) | 15 | 2 (5.1, 5.16) | 1 (5.18) |
| 6. Quản trị, kênh, thông báo, lịch sử | 15 | 0 | 0 | 15 | 0 | 15 | 0 | 0 |
| 7. Xác thực và khôi phục tài khoản | 8 | 0 | 0 | 8 | 0 | 7 | 1 (7.6) | 0 |
| **Tổng** | **96** | **5** | **11** | **77** | **3** | **87** | **8** | **1** |

"Frontend xong" nghĩa là màn hình có route, vào được từ menu, có trạng thái tải, lỗi, rỗng, và đã gọi API ở mục 4 (tự lưu trên trình duyệt khi route chưa có). Nó **không** có nghĩa là dữ liệu đã dùng chung giữa các máy: phần đó cần backend.

Frontend một phần gồm 8 UC, mỗi UC ghi **Một phần** ở cột "Frontend hiện nay": 2.10 (thời tiết còn giả), 2.16 (kiểm sửa chạy ở client, chưa gọi server), 2.17 (xếp lại khi đang đi chạy ở client), 3.5 (chỉ báo khi tab đang mở), 3.6 (đề xuất chỉ lưu trên máy), 5.1 (chưa có ô chọn `transport`), 5.16 (chưa trang nào chặn theo `resources`), 7.6 (chưa có username).

Điều kiện chung của gần như mọi mục "thiếu": **chưa có tài khoản và xác thực phía server**. Mục 3.0 phải xong trước Module 2 đến 7; thứ tự đầy đủ ở mục 6.

## 2. Hiện trạng backend

Backend có 6 route (`app/api/router.py:5-10`):

| Method | Path | Việc | Frontend gọi ở |
|---|---|---|---|
| GET | `/`, `/health` | kiểm tra sống | không gọi |
| POST | `/chat` | trích xuất yêu cầu bằng Gemini (`app/api/routes/chat.py:34-79`) | `src/api/extraction.ts:12` |
| POST | `/retrieval` | gợi ý địa điểm theo yêu cầu, chia mục, phân trang | `src/api/catalog.ts:22` |
| POST | `/routing/days` | chia địa điểm theo ngày | `src/api/routing.ts:92` |
| POST | `/routing` | xếp giờ và tuyến trong ngày | `src/api/routing.ts:120` |

Chưa có: bảng người dùng, đăng nhập, token, phân quyền, CORS, giới hạn tần suất, gửi mail, lưu chuyến đi, bộ sưu tập, báo cáo địa điểm, thông báo, sự kiện, thống kê, doanh nghiệp. `db/schema.sql` chỉ có bảng `pois` (dòng 11). `/retrieval` chỉ nhận TP.HCM (`app/services/retrieval/service.py:27,108`). `/retrieval` và `/routing` trả 503 khi thiếu `DATABASE_URL` (`app/api/routes/retrieval.py:29-35`).

Vì vậy toàn bộ dữ liệu người dùng (tài khoản, hồ sơ, chuyến đi, bộ sưu tập, sự kiện, thông báo) hiện nằm trong localStorage của từng trình duyệt. Giao diện hiện dòng "Máy chủ chưa có API cho phần này" ở bộ sưu tập, chia sẻ, báo cáo địa điểm, thông báo, ảnh đại diện và các trang quản trị, doanh nghiệp; trang chuyến đi, hồ sơ và tài khoản **không** có dòng này.

## 3. Theo từng module

Cột "API đề xuất" ghi đúng cái frontend đang gửi và đọc. Kiểu dữ liệu dùng chung (`TripDto`, `SessionUser`, `PoiSetDto`...) định nghĩa một lần ở mục 4.0.

### 3.0 Nền tảng dùng chung (làm đầu tiên)

| Việc | Chi tiết |
|---|---|
| Bảng `users` | `id`, `email` (unique, không phân biệt hoa thường), `password_hash` (argon2 hoặc bcrypt), `name`, `phone` (E.164), `role` (`traveler`, `business`, `admin`), `status` (`active`, `blocked`, `invited`), `avatar_url`, `pending_email`, `business_id`, `staff_role` (`manager`, `planner`, `viewer`), `resources` (mảng), `blocked_reason`, `created_at`, `last_active_at`. |
| Xác thực | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` (mục 4.1). Token Bearer. Dependency `current_user`, `require_role(...)` cho mọi route; không tin `userId` do client gửi. `GET /auth/me` frontend **chưa gọi**, chỉ cần nếu muốn kiểm phiên khi tải trang. |
| Token một lần | Bảng `link_tokens(token_hash, user_id, purpose: reset\|invite\|email, email, expires_at, used_at)`. Hạn: reset 30 phút (giao diện ghi sẵn "30 phút"), mời 7 ngày, đổi email 24 giờ. |
| Mail | Dịch vụ gửi mail chạy nền, cấu hình `FRONTEND_BASE_URL`. Ba loại link: `/reset-password?token=` (quên mật khẩu và thư mời), `/confirm-email?token=` (đổi email). |
| CORS | Xem mục 0. |
| Lỗi | Một dạng problem+json cho mọi route (C6, **P1**, làm ở bước 2 của mục 6; không đăng ký handler chung cho mọi `HTTPException`, xem C6). Danh sách slug frontend đang so khớp ở mục 4.14. |
| Nhật ký | Bảng `events` (mục 4.10) để mọi module ghi chung; dashboard và lịch sử đọc từ đây. |
| Route công khai | Không cần token: `/`, `/health`, `POST /auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/forgot-username`, `GET /auth/links/{token}`, `POST /auth/reset-password`, `POST /me/email/confirm`, `GET /shared/{token}`, `GET /pois?ids=` (trang `/s/:token` tải địa điểm khi chưa đăng nhập), và `POST /retrieval` cho tới khi trang chia sẻ thôi tải danh mục (`src/pages/SharedTripPage.tsx:33`). Route công khai bỏ qua header `Authorization` hỏng hoặc hết hạn, không trả 401. Mọi route khác trả 401 khi thiếu token, kể cả `/chat`, `/routing`, `/routing/days` (frontend chỉ gọi sau khi đăng nhập). `GET /me/notifications` và `POST /retrieval` được gọi cho mọi vai trò (`src/app/AppShell.tsx:142,251-252`): admin, business nhận kết quả bình thường, không 403. |
| Kiểm chủ sở hữu | Mọi route có `{id}` lọc theo người dùng trong token: `/trips/{id}` (GET, PUT, DELETE), `/trips/{id}/share` (GET, POST, DELETE), `/trips/{id}/incidents`, `/poi-sets/{id}` cùng `/items`, `/restore`, `/me/notifications/{id}`. `/business/employees/{id}` (block, unblock, PATCH, DELETE): nhân viên phải cùng `business_id` với người gọi và không phải tài khoản chủ. Không phải của mình: 404 có slug. |
| Trường client không được đặt | Bỏ qua `role`, `status`, `businessId`, `staffRole` trong `POST /auth/register` và `PATCH /me`; `user_id` trong `/trips`; `userId` trong `/me/profile` và `/events`. |
| Token đăng nhập | Chuỗi ngẫu nhiên ít nhất 256 bit lưu dạng hash (hoặc JWT có `jti`), có hạn theo `remember` (7.4). Kiểm `status` của người dùng ở mỗi request để khoá, xoá có hiệu lực ngay (6.6, 6.7). `POST /auth/logout` thu hồi token đang dùng. `POST /me/password` và `POST /auth/reset-password` thu hồi mọi token khác; đổi mật khẩu giữ token hiện tại (giao diện đã ghi "các thiết bị khác sẽ phải đăng nhập lại", `src/pages/app/AccountPage.tsx:359`). |
| Token trong link | Link đặt lại, mời, đổi email: ngẫu nhiên ít nhất 256 bit, chỉ lưu hash, dùng một lần, cấp link mới thì huỷ link cũ cùng loại. `GET /auth/links/{token}` không tiêu token. `POST /auth/reset-password` từ chối token loại `email`, `POST /me/email/confirm` từ chối token loại khác (`link-invalid`). Không ghi token vào log truy cập. |
| Mật khẩu | Băm argon2id hoặc bcrypt, dài 6 đến 128 ký tự, không ghi vào log. Đăng nhập chỉ trả `account_blocked` sau khi mật khẩu đúng. |
| Giới hạn tần suất | `/auth/login`, `/auth/register`, `/auth/forgot-*` (theo email và IP), `/auth/links/{token}`, `/auth/reset-password`, `/me/password`, `/me/email` (gửi mail tới địa chỉ bất kỳ), `/shared/{token}`, `/pois/{id}/reports`, `/events`, `/business/employees` và `/admin/businesses` (gửi thư mời), `/chat`, `/routing*` (mỗi lần tới 6 giây CPU). Backend triển khai trên Vercel (`vercel.json`, `README.md:110`), mỗi request có thể chạy ở một instance khác, nên bộ đếm đặt ở Postgres, Redis hoặc Vercel Firewall, không để trong RAM. Hiện `/chat` gọi Gemini bằng key của server mà không cần đăng nhập, ai cũng dùng hết hạn mức được (`app/api/routes/chat.py:36-52`). Chừa đợt tải danh mục của frontend: khoảng 45 đến 60 lần `POST /retrieval` liên tiếp mỗi phiên (`src/api/catalog.ts:79-90`). |
| Tài khoản admin đầu tiên | Không có use case tạo admin: tạo bằng script hoặc lệnh CLI khi triển khai (làm ở bước 2 của mục 6). Không tạo sẵn ba tài khoản mẫu của frontend (`src/api/accountStore.ts:13-17`, mật khẩu nằm trong mã nguồn) trên server thật. |
| Khác | Tắt hoặc khoá `/docs`, `/redoc`, `/openapi.json` ở production (hiện `GET /docs` trả 200). Avatar: kiểm loại file theo nội dung, tối đa 1 MB, đặt tên ngẫu nhiên. `/events`: `type` thuộc 21 giá trị ở mục 4.0, tối đa 400 sự kiện mỗi lô, `detail` tối đa 200 ký tự (sự kiện `search` mang nguyên câu tìm kiếm, `src/pages/app/DiscoverPage.tsx:134`). |

### Module 1. Gợi ý địa điểm và bộ sưu tập

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 1.1 Gợi ý dịch vụ | Có | Chỉ TP.HCM (B1); chưa có CORS nên trình duyệt khác origin chưa gọi được; không cá nhân hoá | Giữ `POST /chat` + `POST /retrieval` | P1 | Đã xong: `/app/recommend` (`src/app/AppRoutes.tsx:61`) gọi `/chat` rồi `/retrieval` (limit 8 mỗi mục, `section`, `offset`, `seed` cho "Xem thêm" và "Gợi ý khác"), cho chọn nơi rồi lưu thành bộ (gọi `/poi-sets`) hoặc chuyển sang lập lịch. Chỉ chạy khi có `VITE_API_URL`, không có bản dự phòng trên máy. |
| 1.2 Trích xuất yêu cầu | Có | Không | `POST /chat {text}` | thấp | Đã gọi từ `/app/recommend` và `/app/plan` (`src/api/extraction.ts:12`). |
| 1.3 Danh sách POI | Một phần | `/retrieval` trả danh sách theo yêu cầu, nhưng chưa có cách lấy POI theo danh sách id. Chuyến đi, link chia sẻ và bộ sưu tập chỉ lưu id địa điểm; trình duyệt chưa tải những nơi đó (máy mới, người nhận link, nơi nằm ngoài 8 mục của `/retrieval`: hôm nay danh mục chỉ tải về 954/1.000 điểm) thì chưa có thông tin để vẽ | `GET /pois?ids=a,b,c` (tối đa 100 id, **công khai, không cần token** vì trang `/s/:token` dùng) trả `PoiCard[]`; id lạ thì bỏ qua, không 404. Các trường frontend đọc ở mục 4.6 | **P0, làm cùng `/trips`** | Đã nối (`src/api/catalog.ts:93-114`): sau khi tải chuyến, link chia sẻ hoặc bộ sưu tập, frontend gọi route này một lần cho các id nó chưa biết, rồi lưu kết quả cùng danh sách địa điểm. Route chưa có (404/405 trần) thì không gọi lại, lỗi khác bị bỏ qua. Id vẫn lạ hiện "Địa điểm chưa tải được", không làm hỏng trang. `RetrievalResults` hiện pinned, disambiguation, not_found, từng mục và "Xem thêm" (`section`, `offset`, `limit<=20`), `seed`. Bộ sưu tập ghi "N nơi chưa tải được trên máy này" (`src/pages/app/SetPage.tsx:44-48`). |
| 1.4 Chi tiết POI | Một phần | Không có `GET /pois/{id}`; `PoiCard` thiếu mô tả, ảnh, đánh giá dù bảng `pois` có `description` | `GET /pois/{id}` trả `PoiCard` + `description` | P2 | `PoiSheet` lấy từ dữ liệu đã tải (`poiById`); sẽ dùng `GET /pois/{id}` khi có. |
| 1.5 Báo trạng thái POI | Thiếu | Không có bảng, route, hàng duyệt; không chặn báo trùng | `POST /pois/{id}/reports {type: closed\|hours\|address\|other, note}` (đúng 4 giá trị này; note <= 500, bắt buộc khi `other`). `GET /admin/poi-reports` (không tham số; báo cáo `open` trước, rồi mới nhất trước, vì frontend chỉ hiện 20 dòng đầu, `src/pages/app/admin/DataPage.tsx:165`; `at` là thời điểm tạo) trả `PoiReport[]` **camelCase** `{id, poiId, userId, type, note, at, status: open\|resolved}`. `PATCH /admin/poi-reports/{id} {status: "resolved"}`. Cùng người báo lại cùng nơi khi báo cáo cũ còn mở: cập nhật `type`, `note` của báo cáo đó và trả 200, không 409 (frontend báo "Chưa gửi được" với mọi lỗi, `src/components/place/ReportSheet.tsx:24`) | P2 | Đã nối 3 route (`src/api/poiReports.ts:25,32,39`), hàng duyệt ở `/app/admin/data`. Trạng thái "đã báo" hiện chỉ nhớ trên máy gửi. |
| 1.6 Lưu danh sách POI | Thiếu | Không có bộ sưu tập | `POST /poi-sets {name, description, poi_ids}` và `POST /poi-sets/{id}/items {poi_ids}` (thêm hàng loạt, bỏ qua id đã có) | P1 | Đã gọi (`SetChooser`). "Yêu thích" KHÔNG phải một bộ: vẫn là `saved` trong `PUT /me/profile`. |
| 1.7 Danh sách POI chung | Một phần | Không có route liệt kê; frontend phải tải cả catalogue qua `/retrieval` với 8 sở thích (nơi không thuộc sở thích nào có thể không bao giờ về) | `GET /pois?city=<tên điểm đến như /retrieval, ví dụ "Ho Chi Minh City">&offset=&limit=` (limit tối đa 200) trả `{items: PoiCard[], total}`. Không cần `category`, `price`, `sort`: frontend tự đổi `PoiCard` sang loại, giá rồi lọc trên máy như hiện nay. Cùng path với 1.3 nhưng khác tham số | P1 | `loadCatalog` tải qua `/retrieval` (`src/api/catalog.ts:79-90`) rồi lọc, tìm, phân trang "Xem thêm" trên máy. |
| 1.8 Tìm POI | Thiếu | Không có route tìm | `GET /pois/search?q=&city=&category=&price=&open_at=&near=&page=` (không dấu, trigram) | P2 | `searchPois` chạy trên dữ liệu đã tải (`src/api/places.ts`). |
| 1.9 Lọc theo loại | Một phần | Có cột taxonomy nhưng không có route lọc hay `GET /taxonomy` | Không cần route riêng; lọc loại chạy ở client. | P2 | Chip loại chạy trên máy. |
| 1.10 Tìm theo tên | Một phần | Chỉ qua `must_visit` của `/retrieval` (`app/services/retrieval/names.py:64-72`) | Gộp vào `GET /pois/search?q=` | P2 | Chạy trên máy, không phân biệt dấu. |
| 1.11 Xem danh sách bộ | Thiếu | Không có | `GET /poi-sets` trả **mảng đầy đủ** `PoiSetDto[]` (cần `poi_ids` để vẽ ảnh bìa và đếm; không dùng `count`, `cover`). `GET /poi-sets/{id}` trả `PoiSetDto`, 404 `set-not-found` nếu không phải của người dùng hoặc đã xoá | P1 | Đã gọi (`src/api/poiSets.ts:64,70`), có trạng thái lỗi và "Thử lại". |
| 1.12 Xoá bộ | Thiếu | Không có; chưa có khôi phục | `DELETE /poi-sets/{id}` (kiểm chủ, xoá mềm, **giữ** mục con, trả 204). `POST /poi-sets/{id}/restore` body `{}` trả `PoiSetDto`; 404 `set-not-found` nếu quá hạn; 409 `set-name-taken` nếu đã có bộ khác cùng tên | P1 | Đã gọi; nút "Hoàn tác" gọi restore (`poiSets.ts:140,151`). |
| 1.13 Tạo bộ mới | Thiếu | Không có | `POST /poi-sets {name (1-60 ký tự sau trim), description (<=300), poi_ids (<=100)}` trả 201 `PoiSetDto`. Lỗi slug: `set-name-required`, `set-name-too-long`, `set-name-taken` (không phân biệt hoa thường, trong cùng người dùng, chỉ tính bộ chưa xoá), `set-full`, `poi-not-found` | P1 | Đã gọi (`poiSets.ts:91`), đã map đủ các slug sang câu thông báo (`poiSets.ts:170-177`). Giới hạn 100 nơi, tên 60 ký tự (`poiSets.ts:24-25`). |
| 1.14 Tạo bộ thủ công | Thiếu | Không có | `PATCH /poi-sets/{id} {name?, description?, poi_ids?}`: `poi_ids` (nếu có) **thay toàn bộ** danh sách theo thứ tự (dùng để sắp xếp và để hoàn tác khi bỏ một nơi); không dùng trường `position`. Trả 200 `PoiSetDto`. Cùng slug như 1.13 | P1 | Đã gọi (`poiSets.ts:106`). Tên bị từ chối thì ô nhập quay về tên đã lưu. |
| 1.15 Thêm POI vào bộ | Thiếu | Không có | `POST /poi-sets/{id}/items {poi_ids}` idempotent; 404 `poi-not-found` nếu id lạ; 409 `set-full` khi quá 100. `DELETE /poi-sets/{id}/items/{poi_id}`. **Cả hai trả 200 `PoiSetDto` đầy đủ**, không trả 204 (frontend đọc `poi_ids` từ phản hồi) | P1 | Đã gọi (`poiSets.ts:125,132`); bộ chọn địa điểm có tìm, lọc loại, "Xem thêm". |
| 1.16 Chọn POI để thêm | Thiếu | Như 1.15 | Như 1.15 (bật/tắt từng bộ cho một nơi) | P1 | Đã gọi từ chi tiết địa điểm và kết quả tìm; chỉ hiện cho lữ khách và khi phân hệ `sets` đang bật. |

Bảng cần thêm: `poi_sets(id, user_id, name, description, created_at, updated_at, deleted_at)`, `poi_set_items(set_id, poi_id, position, added_at)` (khoá `(set_id, poi_id)`), `poi_reports(id, poi_id, user_id, type, note, status, created_at, resolved_at)`. Các bảng mới (`trips.body`, `poi_set_items`, `poi_reports`, `business_places`, `saved` trong hồ sơ) tham chiếu `pois.id` nhưng **không đặt khoá ngoại cứng**: mỗi lần nhập dữ liệu có thể làm mất id (lần này 590/1.000, xem D1). Khi kiểm `poi-not-found` chỉ kiểm id **mới thêm**, không kiểm lại id đã nằm trong bộ từ trước; nếu không, bộ sưu tập chứa một id đã mất sẽ không sửa được nữa vì `PATCH /poi-sets/{id}` gửi lại cả danh sách.

### Module 2. Quản lý lịch trình

UC 1.13 cũng nằm trong sơ đồ này (con của 2.9) nhưng đã tính ở Module 1.

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 2.1 Danh sách lịch trình | Thiếu | Không có bảng `trips` | `GET /trips` (không tham số) trả **mảng trần** `TripDto[]` của người dùng hiện tại. Không bọc `{items, total}` (frontend sẽ lỗi) | P0 | Đã gọi (`src/api/trips.ts:34`), sắp xếp ở client, có trạng thái lỗi. Nơi chưa tải được lấy bằng `GET /pois?ids=` (1.3). |
| 2.2 Xem lịch trình | Thiếu | Không lưu `days`, `stops`, `version`, `status`, thông tin routing; không kiểm chủ | `GET /trips/{id}` trả `TripDto`. Không có hoặc không phải của mình: 404 problem+json slug `trip-not-found` (hoặc 403 `forbidden`), **không** dùng `HTTPException` mặc định | P0 | Đã gọi (`trips.ts:44`); lỗi mạng hoặc 5xx hiện "Chưa tải được" kèm "Thử lại", chỉ 404/403 mới hiện "Không tìm thấy". Nơi trong chuyến mà trình duyệt chưa có được tải bằng `GET /pois?ids=` (1.3); nơi vẫn lạ hiện "Địa điểm chưa tải được" và bị bỏ khỏi bản đồ, trang không lỗi. |
| 2.3 Xoá lịch trình | Thiếu | Không có | `DELETE /trips/{id}` (xoá mềm, trả 204). Sau đó `GET /trips/{id}` trả `trip-not-found` và link chia sẻ của chuyến trả `link-invalid` | P1 | Đã gọi (`trips.ts:128`), báo lỗi khi xoá không được. |
| 2.4 Chia sẻ | Thiếu | Không có link, bảng chia sẻ | `GET /trips/{id}/share` trả 200 `Share` hoặc `null` (không trả 404 khi chưa có link). `POST /trips/{id}/share` body `{}` trả `Share` (gọi lại thì trả link đang có). `DELETE /trips/{id}/share` (204). `GET /shared/{token}` công khai, không cần token, trả `{trip: TripDto, ownerName, createdAt}`; link thu hồi hoặc chuyến đã xoá: 404 slug `link-invalid`; `trip.user_id` và `trip.request` trả chuỗi rỗng (xem "Kiểm dữ liệu `TripDto`" dưới bảng) | P1 | Đã có nút Chia sẻ, trang `/s/:token`, nhân bản từ link (`src/api/shares.ts:27,34,48,62`). Frontend tự dựng link `${origin}/s/${token}` nên không cần trường `url`. Khi chưa có API, link chỉ mở được trên cùng trình duyệt. Trang `/s/:token` tải nơi còn thiếu bằng `GET /pois?ids=` (1.3) và có khung báo lỗi riêng (`src/App.tsx:50`). |
| 2.5 Tạo lịch trình | Thiếu | Không có chỗ lưu | `POST /trips` body là **`TripDto` đầy đủ** (không phải `{title, city, start_date, days, status, source}`). Backend giữ `id` frontend gửi (dạng `t-xxxx`), lấy người dùng từ token và bỏ qua `user_id` trong body, trả `TripDto`. Không có trường `source` | P0 | Đã gọi (`trips.ts:59`); sau khi tạo, frontend mở chuyến theo `id` trong phản hồi. |
| 2.6 Tạo trống | Thiếu | Như 2.5 | `POST /trips` với `days` gồm N phần tử `{index, stops: []}`, `request: ""`, `status: "draft"`, `solver.model: "manual"`, `scheduled: false` | P1 | Đã làm (`BlankTripSheet`), gọi `POST /trips`. |
| 2.7 Nhân bản | Thiếu | Như 2.5 | Không cần route clone riêng: frontend tự dựng bản sao rồi gọi `POST /trips` (`clonedFrom` = id gốc, `status: "draft"`, `version: 1`, `uid` điểm dừng mới). Với lịch từ link chia sẻ: đọc `GET /shared/{token}` rồi `POST /trips` | P1 | Đã làm (`src/domain/tripCopy.ts:55-75`). `POST /trips/{id}/clone`, `POST /shared/{token}/clone` là tuỳ chọn. |
| 2.8 Sinh lịch tối ưu | Một phần | Không có route sinh trọn gói; chọn địa điểm và chấm điểm chạy ở client; chỉ TP.HCM; không có thời tiết | Giữ 3 lời gọi hiện có; `POST /itineraries/generate` là tuỳ chọn | P2 | Gọi `/chat` (chỉ khi người dùng gõ thêm chữ) → `/retrieval` → `/routing/days`. **Không** gọi `/routing` lúc sinh: giờ chỉ xếp khi người dùng bấm "Tạo lịch trình" ở trang chuyến đi. |
| 2.9 Truy xuất POI | Có | Chỉ TP.HCM | Giữ `POST /retrieval {extraction, limit, section?, offset?, seed?}`. Không cần `poi_set_id`: nơi trong bộ sưu tập được gửi thành `must_visit_ids` của `/routing` | P2 | Đã gọi (`catalog.ts:22`), kể cả ở bước xem lại ("Xem nơi hợp với yêu cầu"). |
| 2.10 Truy xuất tri thức | Một phần | Chỉ có dữ liệu POI tĩnh; không có thời tiết, sự kiện, đóng cửa; thời lượng tham quan còn là số tạm (A3, A4) | `GET /conditions?city=&date=` hoặc ghi rõ là ngoài phạm vi | P2 | **Một phần:** thời tiết vẫn giả bằng hàm băm (`src/domain/conditions.ts:22`) và vẫn ảnh hưởng chọn nơi (cờ `rainy`); trang lập lịch chưa gắn nhãn "ước tính". Chưa gọi server. |
| 2.11 Điều chỉnh điều kiện | Một phần | Chỉ qua JSON extraction, không có điều kiện thời tiết/giờ | Giữ; thêm tham số khi có 2.10 | P2 | Đã làm: chip điều kiện sửa được, gọi lại `/retrieval` với extraction đã sửa. |
| 2.12 Lưu lịch trình | Thiếu | Không lưu, không khoá phiên bản | `PUT /trips/{id}` nhận `TripDto` đầy đủ; `version` là bản frontend đang sửa. Khác version trong DB: 409 problem+json; khớp: lưu và trả `TripDto` với `version + 1`. `status` hợp lệ: `draft`, `upcoming`, `live`, `completed`, `cancelled` (không có `saved`); "Lưu lịch trình" đổi `draft` → `upcoming`. Kiểm version bằng một câu `UPDATE ... WHERE id = ? AND user_id = ? AND version = ?` (pool đang `autocommit`, `app/services/retrieval/db.py:30`), không đọc rồi mới ghi | P0 | Đã gọi (`trips.ts:71`). Mỗi chuyến lưu từng lần một: lần sau mang `version` do lần trước trả về, các lần sửa dồn trong lúc chờ được gộp thành một lần (`src/api/trips.ts:85-122`), nên chỉ gặp 409 khi thật sự có nơi khác sửa. Lưu lỗi thì quay về bản đã lưu và báo một lần; 409 hiện "đã sửa ở nơi khác" và tải lại. Hoàn tác gửi nội dung cũ kèm version hiện tại. Xếp lại khi đang đi giữ nguyên `version` của bản đang sửa (`src/domain/replan.ts:188`). |
| 2.13 Sửa lịch trình | Một phần | `/routing` không nhận thứ tự hay thời lượng người dùng chỉnh | Thêm `visit_minutes` theo điểm (C9) và `keep_order` (C10) cho `/routing` | P2 | "Gợi ý lại" gọi `/routing/days` (pin = điểm đã khoá); "Tạo lịch trình"/"Xếp lại lịch" gọi `/routing`; frontend báo "Máy chủ đã xếp lại thứ tự và thời lượng" khi server bỏ chỉnh tay. |
| 2.14 Sửa thủ công | Thiếu | `app/services/routing/validate.py` chỉ được `solve()` dùng để tự kiểm kết quả (`service.py:289`) và trong benchmark, chưa mở thành route | Xem 2.16 | P2 | Đã làm; kiểm ở client (`src/domain/edit.ts`), mỗi lần sửa lưu bằng `PUT /trips/{id}`. |
| 2.15 Sửa tự động | Một phần | Không có route "chỉnh lịch"; gộp extraction cũ và mới nằm ở frontend | `POST /trips/{id}/adjust {text}` trả bản đề xuất (không ghi), tuỳ chọn | P2 | Gọi `/chat` (1 lần cho yêu cầu mới; thêm 1 lần cho yêu cầu gốc nếu chuyến cũ chưa lưu `extraction`; chuyến tạo trống thì không gọi) + `/retrieval`, rồi xếp bằng bộ xếp trên máy. **Không** gọi `/routing`. |
| 2.16 Kiểm tra sửa | Thiếu | Luật routing (`rules.yaml`) chỉ chạy khi xếp lịch | `POST /routing/validate {day}` trả `violations[]` | P2 | **Một phần:** kiểm giờ mở, quá giờ, ngân sách, trùng ở client; chưa gọi server. |
| 2.17 Xếp lại lịch và tuyến | Một phần | Không có chế độ "đã đi xong các điểm này, đang ở X lúc T"; `start` hiện là toạ độ trung tâm thành phố | Không cần route mới: `POST /routing` hiện đã xếp lại được phần còn lại của ngày (gửi `places` = các điểm chưa đi, `start` = vị trí hiện tại, `start_at` = bây giờ). `done_ids`, `now` hay `POST /routing/replan` là tuỳ chọn; frontend đang xếp lại ở client (`src/domain/replan.ts`) và chưa gọi server | P2 | **Một phần:** đã gọi `/routing`, `/routing/days`; xếp lại khi đang đi chạy ở client (`src/domain/replan.ts`). |
| 2.18 Tối ưu tuyến | Có | Lỗi ở mục 5 (C1 đến C4, C7 đến C11) | `POST /routing`, `/routing/days` | P0 | Đã gọi (`src/api/routing.ts:92,120`). Frontend giới hạn 7 ngày, backend cho 14 (`app/schemas/routing.py:13-14`). |
| 2.19 Chọn từ bộ đã lưu | Thiếu | Không có `/poi-sets` | Dùng `GET /poi-sets` (Module 1); nơi trong bộ gửi thành `must_visit_ids`. Không cần `poi_set_id` | P1 | Đã làm (`SetPickerSheet` ở trang lập lịch, nút "Lên lịch trình từ bộ này"). |
| 2.20 Trích xuất yêu cầu | Có | Cần `GEMINI_API_KEY`; không giới hạn theo người dùng | `POST /chat` | thấp | Đã gọi; không gọi khi người dùng chỉ dùng form. |
| 2.21 Chấp nhận sửa | Thiếu | Không lưu được | `PUT /trips/{id}` (như 2.12) | P1 | Gọi `PUT /trips/{id}` qua `saveTrip`. |
| 2.22 Từ chối sửa | Không cần | Tuỳ chọn ghi sự kiện | `POST /events` (mục 4.10), type `edit_rejected` | thấp | Đã làm; gửi sự kiện theo lô. |

Bảng cần thêm: `trips(id, user_id, status, version, start_date, city, body jsonb, created_at, updated_at, deleted_at)`. Cách dễ nhất là lưu cả `TripDto` vào `body` (nó có nhiều trường: `extraction`, `routing`, `solver`, `scheduled`, `stopsPerDay`, `autoTitle`, `clonedFrom`, `cancelledAt`, `cancelReason`, `mustInclude`, `avoidTags`, `interests`, `keywords`, `rainy`...) và tách vài cột để lọc. Thêm `trip_shares(token, trip_id, owner_name, created_at, revoked_at)`. Các tham chiếu tới `pois.id` không đặt khoá ngoại cứng (xem ghi chú dưới bảng Module 1).

**Kiểm dữ liệu `TripDto`.** `TripDto` do client gửi và được phát lại cho người khác qua `GET /shared/{token}`, nên không lưu nguyên xi. Tối thiểu: `days[].stops[].uid` khớp `^[A-Za-z0-9_-]{1,40}$` (frontend đã escape `uid` khi vẽ ghim bản đồ, `src/components/map/RouteMap.tsx:40,139`, nhưng backend vẫn không được lưu chuỗi chứa thẻ HTML vì client khác có thể không escape), `stops[].poiId` là chuỗi tối đa 80 ký tự và **không bắt buộc có trong bảng `pois`** (id có thể mất sau lần nhập dữ liệu, xem D1; frontend hiện "Địa điểm chưa tải được"), `id` khớp `^t-[0-9a-z]{8,24}$`, `start_date` là ngày có thật dạng `YYYY-MM-DD` (frontend bỏ trống ngày nếu không đọc được, `src/domain/time.ts:40-45`), `city`, `status`, `pace`, `transport`, `mode` đúng tập giá trị ở mục 4.0, giờ trong khoảng 0..1439, tối đa 14 ngày và 50 điểm, thân request tối đa 256 KB. `POST /trips` gặp `id` đã có: của chính người đó thì trả chuyến đang có, của người khác thì 409, không ghi đè. `GET /shared/{token}` trả `trip` với `user_id: ""` và `request: ""` (trang chia sẻ không dùng; `request` là nguyên văn lời người dùng gõ). Token chia sẻ: ngẫu nhiên ít nhất 128 bit, không suy ra từ `id` chuyến.

### Module 3. Theo dõi chuyến, sự cố, thích ứng

Vị trí thật đã dùng `navigator.geolocation`; chế độ "Mô phỏng" vẫn có để thử. Mọi chuyển trạng thái chuyến (bắt đầu, xong, huỷ, mở lại, chấp nhận đổi lịch, hoàn tác) đều đi qua **`PUT /trips/{id}`**, không qua route riêng.

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 3.1 Theo dõi trên bản đồ | Thiếu | Không có bảng trips, không có trạng thái chuyến | `PUT /trips/{id}` cho phép `upcoming → live` (bắt đầu, `src/pages/app/TripPage.tsx:236`) và `live → completed` (`src/pages/app/LivePage.tsx`, hàm `complete`). `POST /trips/{id}/start`, `/complete`, `/position`, `GET /progress` là tuỳ chọn | P1 | Đã làm ở client (vị trí thật, ETA, tới nơi trong 120 m); không gửi vị trí lên server. |
| 3.2 Cấp quyền vị trí | Không cần | Không | Không | thấp | Đã xong ở client (`LocationPermissionSheet`); chế độ gps/demo chỉ lưu localStorage. Frontend không gọi `/me/preferences`. |
| 3.3 Phát hiện sự cố ngoài | Thiếu | Không có nguồn thời tiết, giao thông, đóng cửa; không có dịch vụ phát hiện | `GET /trips/{id}/incidents` trả **mảng trần** `Incident[]` (mục 4.4). `poi_id` **bắt buộc** với `closure` (id POI, không phải id điểm dừng); `until` là số phút từ 00:00 giờ Việt Nam (không phải timestamp); `delay_minutes` mặc định 15. `severity` được dùng: `minor` tự chỉnh, `major` hỏi người dùng. Frontend **không** dùng `id` và `affected_stop_ids`; nó coi hai sự cố là một khi cùng `kind` và cùng `poi_id` (closure) hoặc cùng `delay_minutes` (traffic, delay); mỗi chuyến mỗi ngày chỉ xử lý một sự cố `weather` (`src/store/liveStore.ts:63`). Frontend hỏi lại mỗi 60 giây, nên: giữ nguyên `delay_minutes` của một sự cố giữa các lần trả (làm tròn 5 phút), đổi số là người dùng bị hỏi lại; bỏ sự cố đã hết khỏi mảng. `poi_id` của `closure` nên là một nơi **đang có trong lịch của chuyến**; id khác không ảnh hưởng điểm dừng nào (trang Live không còn lỗi, tên nơi lạ hiện "Địa điểm chưa tải được", `src/pages/app/LivePage.tsx:766`). Kiểm chủ chuyến như `GET /trips/{id}` | P2 | Đã gọi (`src/api/incidents.ts:27`) mỗi 60 giây khi chuyến `live` và ở chế độ vị trí thật. Lỗi tải hiện "Chưa đọc được sự cố", 404 hiện "Máy chủ chưa có API". Nút giả lập ở chế độ Mô phỏng. |
| 3.4 Tự thích ứng sự cố nhỏ | Thiếu | Không có route xếp lại một phần | Không cần route mới: `POST /routing` hiện đã xếp lại được phần còn lại của ngày (gửi `places` = các điểm chưa đi, `start` = vị trí hiện tại, `start_at` = bây giờ). `done_ids`, `now` hay `POST /routing/replan` là tuỳ chọn; frontend đang xếp lại ở client (`src/domain/replan.ts`) và chưa gọi server | P2 | Chạy `src/domain/replan.ts` ở client, lưu bằng `PUT /trips/{id}`. Công tắc "Tự chỉnh thay đổi nhỏ" là `autoAdjust` trong `PUT /me/profile`. |
| 3.5 Thông báo người dùng | Thiếu | Không có thông báo phía server, không có Web Push | Xem 6.15. Muốn báo khi tab đã đóng thì cần bộ phát hiện phía server + Web Push hoặc SSE | P2 | **Một phần:** chuông trong ứng dụng; thông báo hệ thống của trình duyệt khi tab ở nền. Cảnh báo sự cố chỉ sinh khi trang Live đang mở và chỉ lưu trên máy. |
| 3.6 Đề xuất sửa gửi người dùng | Thiếu | Không có thực thể đề xuất | Tuỳ chọn `GET /trips/{id}/edit-requests` với `{id, trip_id, day_index, disruption {kind, minutes\|until\|poi_id}, at, created_at, expires_at}` | P2 | **Một phần:** đề xuất lưu ở localStorage (`journie-live-v1`), sống qua tải lại, tự hết hạn sau 15 phút. Frontend chưa gọi route nào. |
| 3.7 Từ chối đề xuất | Thiếu | Không ghi quyết định | Chỉ cần `POST /events` nhận type `replan_dismissed`; `POST /edit-requests/{id}/reject` tuỳ chọn | P2 | Ghi ở localStorage và gửi sự kiện `replan_dismissed`. |
| 3.8 Chấp nhận đề xuất | Thiếu | Không lưu được lịch mới | `PUT /trips/{id}` (version cũ → 409 problem+json, không phải 404). `POST /edit-requests/{id}/accept` tuỳ chọn (cùng route `PUT /trips/{id}` với 2.12) | P1 | Tính phương án ở client, gửi cả lịch bằng `PUT /trips/{id}`; lưu lỗi thì đề xuất hiện lại. |
| 3.9 Huỷ chuyến đang đi | Thiếu | Không có trạng thái huỷ | `PUT /trips/{id}` với `status: "cancelled"`, `cancelledAt` (ISO), `cancelReason` (`weather`\|`health`\|`plans`\|`other` hoặc không có). Hai trường này đi **camelCase**. Phải cho `cancelled → upcoming` ("Mở lại chuyến" gửi `status: "upcoming"` và **không có** `cancelledAt`, `cancelReason` → backend xoá hai giá trị này). `POST /trips/{id}/cancel` tuỳ chọn (cùng route `PUT /trips/{id}` với 2.12; backend chỉ cần không chặn `status: cancelled`, `cancelled → upcoming` và giữ `cancelledAt`, `cancelReason`) | P1 | Đã xong ở trang chuyến và trang Live. |

Sự kiện Module 3 gửi qua `POST /events`: `trip_started`, `trip_completed`, `trip_cancelled`, `replan_suggested`, `replan_accepted`, `replan_dismissed`, `replan_auto`. Bộ phát hiện phía server nên tôn trọng `alerts {traffic, weather, closure, delay}` và `autoAdjust` trong hồ sơ.

### Module 4. Dashboard và dữ liệu

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 4.1 Thu thập dữ liệu lịch trình | Thiếu | Không có nơi nhận và lưu sự kiện | `POST /events {events: AnalyticsEvent[]}` (mục 4.10; trường thời gian là `t`, không có `payload`, `at`; lấy người dùng từ token, bỏ qua `userId` client gửi), trả 204. `GET /admin/itineraries?date_from=&date_to=&city=` trả `ItineraryRow[]` (không phân trang). Không cần `/export`: CSV dựng ở client. Trả tối đa 1.000 lịch trình mới nhất, mới nhất trước | P2 | Trang `/app/admin/data`: nút "Thu thập/đồng bộ" gọi `POST /events`, bảng gọi `GET /admin/itineraries`. Sự kiện gửi theo lô 4 giây sau mỗi lần ghi. |
| 4.2 Huấn luyện mô hình | Thiếu | Không có job, phiên bản mô hình | `POST /admin/train` body `{}` trả `TrainingJob`; `GET /admin/train/{id}` trả `TrainingJob`; `GET /admin/train` trả `TrainingJob[]` mới nhất trước. `progress` trong khoảng **0..1**. Không phải admin: 403 | P2 (tuỳ chọn) | Panel "Huấn luyện mô hình", hỏi trạng thái mỗi 2 giây tới khi xong; không có bản trên máy, route 404 thì nút bị khoá kèm giải thích. |
| 4.3 Dashboard tổng | Thiếu | Không có admin thật, không có thống kê | `GET /admin/stats?date_from=&date_to=&city=&category=` (bỏ tham số khi chọn "tất cả"), trả một object `Stats` (mục 4.11). KPI id: `users, trips, live, replans, searches, sets` | P2 | `/app/analytics` đã dựng (KPI, biểu đồ, bảng); dùng số liệu trên máy khi 404. |
| 4.4 Dashboard doanh nghiệp | Thiếu | Không có vai trò `business`, không có quan hệ doanh nghiệp - địa điểm | `GET /business/stats?date_from=&date_to=&city=&category=` trả `Stats` với KPI `places, inclusions, saves, opens, reports`; backend tự lấy tập địa điểm theo token, frontend không gửi id. `GET /business/places` trả `string[]`; `PUT /business/places {poi_ids}` trả `string[]`. Bảng `business_places(business_id, poi_id)` | P2 | `/app/business` gọi 3 route trên; hiện doanh nghiệp tự chọn địa điểm của mình (xem câu hỏi mở). |
| 4.5 Chức năng dashboard | Thiếu | Chưa có tham số chung | Chỉ 4 tham số `date_from`, `date_to`, `city`, `category`. Không cần `sort_by`, `order`, `page`, `limit`: sắp xếp và cắt 200 dòng làm ở client | P2 | Dùng chung `DashboardView` + `useDashboardFilters`. |
| 4.6 Lọc / sắp xếp | Thiếu | Như 4.5 | Như 4.5; `/admin/itineraries` chỉ dùng `date_from`, `date_to`, `city` | P2 | Bộ lọc giữ trên URL; sắp xếp ở client. |
| 4.7 Xuất báo cáo | Thiếu | Không có | `GET /admin/report?...&format=csv` và `GET /business/report?...&format=csv` (cùng bộ lọc) trả JSON **`{url}`**, là link ký sẵn: frontend tải link đó **không kèm** `Authorization` và báo lỗi nếu không phải 2xx hoặc nếu trả `text/html`. Chỉ dùng `format=csv`. `url` phải là **URL tuyệt đối** (frontend gọi `fetch(url)` nguyên như nhận được, `src/api/admin.ts:267-271`; URL tương đối sẽ trỏ về host frontend và trả trang `index.html`, frontend coi `text/html` là lỗi và hiện "Chưa xuất được báo cáo"), cho phép CORS GET từ origin frontend, khó đoán và hết hạn sau vài phút. File là CSV UTF-8. | P2 | Nút "Xuất CSV" ở cả hai dashboard; 404 thì dựng CSV ở client từ bảng đang xem. |
| 4.8 Trực quan hoá | Thiếu | Không có số liệu tổng hợp | Không cần `stats/timeseries`, `top`, `distribution`: mọi biểu đồ đọc từ `series`, `categories`, `cities`, `places`, `funnel` của `Stats` | P2 | Biểu đồ SVG đã xong. |

### Module 5. Tài khoản và người dùng

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 5.1 Hồ sơ và sở thích | Thiếu | Không có hồ sơ phía server; planner phía server không đọc được sở thích | `GET /me/profile` trả và `PUT /me/profile` nhận cùng một object **camelCase** `Profile` (mục 4.3). Dùng `saved` (không phải `saved_poi_ids`); `interests` là object trọng số 0..1 theo loại; có `autoAdjust`. Bỏ qua `userId`, `name` trong body. Người dùng chưa lưu hồ sơ: `GET /me/profile` trả 200 với `{}` (frontend tự điền mặc định, `src/api/profile.ts:57`), không 404. Không trả sẵn `interests: {}` cho hồ sơ chưa lưu: sở thích chọn lúc đăng ký chỉ nằm trên máy (`src/pages/auth/RegisterPage.tsx:97`) và sẽ bị `{}` ghi đè | P1 | **Một phần:** đã nối (`src/api/profile.ts:57,62`), báo lỗi khi lưu không được. Chưa có ô chọn `transport` trên giao diện. |
| 5.2 Sáng/tối | Không cần | Không | Không (nếu muốn đồng bộ: thêm `theme` vào `/me/profile`) | thấp | Chip bầu trời Tự động/Ngày/Đêm, lưu localStorage `journie-sky`. |
| 5.3 Ảnh đại diện | Thiếu | Không có upload, kho file | `POST /me/avatar` multipart, trường `file` (frontend luôn gửi ảnh vuông 256x256 `image/webp`, tên `avatar.webp`). `DELETE /me/avatar`. Cả hai trả `SessionUser` đầy đủ với `avatarUrl` là **URL tuyệt đối**. 413/415/422 khi file sai | P2 | Đã xong và đã gọi (`src/api/auth.ts:221,229`). |
| 5.4 Đặt lại mật khẩu | Thiếu | Không có token, không đổi mật khẩu | `POST /auth/forgot-password {email}` (cùng phản hồi cho email có và không có); **`GET /auth/links/{token}`** trả `{purpose: reset\|invite\|email, email}`, lỗi slug `link-invalid` hoặc `link-expired`; `POST /auth/reset-password {token, password}` (dùng được cho cả reset và lời mời, lời mời thì đổi `invited` → `active`) | P1 | Trang `/forgot` và `/reset-password` đã xong. Trang đặt lại gọi `GET /auth/links/{token}` **trước**: thiếu route này thì mọi link thật đều bị báo "không hợp lệ". |
| 5.5 Gửi mail link đặt lại | Thiếu | Không có mailer, chưa có `FRONTEND_BASE_URL` | Mailer + 3 loại link ở mục 3.0 | P1 | Các trang đích đã có. |
| 5.6 Đổi email | Thiếu | Không xác minh email mới | `POST /me/email {email, password}` (trường là `email`, không phải `new_email`) trả `{pending_email}`. `POST /me/email/confirm {token}` **không cần** `Authorization` (có thể mở ở trình duyệt khác), trả `SessionUser` đã đổi email, `pendingEmail` rỗng hoặc null. Lỗi: `invalid_credentials` (400/403/422, không 401), `email_taken` 409, `link-invalid`, `link-expired` | P2 | Hộp thoại "Đổi email" và trang `/confirm-email` đã xong. |
| 5.7 Đổi thông tin tài khoản | Thiếu | Không có | `PATCH /me {name, phone}` (phone E.164 hoặc `null` để xoá) trả `SessionUser`. `POST /me/password {current_password, new_password}` (không phải `{current, new}`), sai mật khẩu hiện tại: `invalid_credentials` với 400/403/422 | P1 | Đã nối (`auth.ts:156,203`). |
| 5.8 Đổi số điện thoại | Thiếu | Không có cột | Trong `PATCH /me`; kiểm lại `^\+\d{9,15}$`. Không có route xác minh OTP | P2 | Chuẩn hoá +84 trước khi gửi. |
| 5.9 Danh sách nhân viên | Thiếu | Không có doanh nghiệp, nhân viên | `GET /business/employees?q=&status=all\|active\|invited\|blocked&page=&page_size=` (mặc định 10) trả `{items: Employee[], total, page, pageSize}`. Doanh nghiệp lấy từ token | P2 | Trang `/app/employees` đã xong (`src/api/staff.ts:29`). |
| 5.10 Chi tiết nhân viên | Thiếu | Như trên | Frontend **không** gọi `GET /business/employees/{id}`; chi tiết lấy từ dòng danh sách, nên danh sách phải có đủ `phone, createdAt, lastActiveAt, staffRole, resources` | P2 | Đã xong. |
| 5.11 Khoá nhân viên | Thiếu | Không có trạng thái; đăng nhập phải từ chối | `POST /business/employees/{id}/block` và `/unblock` body `{}` trả `Employee`. Đăng nhập tài khoản khoá: `account_blocked`; tài khoản mời chưa kích hoạt: `account_invited` | P2 | Đã xong. |
| 5.12 Xoá nhân viên | Thiếu | Chưa có chính sách | `DELETE /business/employees/{id}` (204); 404 `user_not_found` | P2 | Đã xong; giao diện nói "không lấy lại được tài khoản" (nếu backend xoá mềm thì cần thống nhất câu chữ). |
| 5.13 Đổi vai trò nhân viên | Thiếu | Không có mô hình vai trò | `PATCH /business/employees/{id} {role, resources}` (một route chung, không có `/role`, không có `GET /business/roles`); `role` là `manager\|planner\|viewer`; trả `Employee`; 403 khi không có quyền | P2 | Đã xong; 3 vai trò cố định ở client. |
| 5.14 Tạo nhân viên | Thiếu | Không có; không mời qua mail | `POST /business/employees {name, email, phone (E.164\|null), role, resources}` trả 201 `Employee` (`status: invited`, vai trò nằm ở `staffRole`); 409 `email_taken`; gửi thư mời `/reset-password?token=` (purpose `invite`, 7 ngày) | P2 | Đã xong. |
| 5.15 Nhập thông tin tài khoản | Thiếu | Thuộc 5.14 | Tên, email, điện thoại; người quản lý không nhập mật khẩu | P2 | Đã xong (bước 1 của form). |
| 5.16 Gán vai trò theo tài nguyên | Thiếu | Không có khái niệm tài nguyên | `resources` là mảng trong 4 giá trị cố định `dashboard`, `places`, `reports`, `employees` (không có `GET /business/resources`). Backend phải **tự áp quyền** theo `role` + `resources` | P2 | **Một phần:** có ô chọn, nhưng chưa trang nào chặn theo hai trường này. |
| 5.17 Tạo tài khoản doanh nghiệp | Thiếu | Không có thực thể doanh nghiệp | `POST /admin/businesses {company_name, owner_name, owner_email, phone (E.164\|null), plan: starter\|pro}` (trường là `company_name`; chưa có `model_id`) trả 201 `Business`. `GET /admin/businesses` trả **mảng** `Business[]` (không phân trang). 409 `email_taken`. Tạo tài khoản chủ role `business` + `businessId`, gửi thư mời | P2 | Đã xong (`staff.ts:109,135`). |
| 5.18 Gán mô hình riêng | Thiếu | `/chat`, `/retrieval`, `/routing` dùng một cấu hình chung | `GET /admin/models`; `model_id` trên doanh nghiệp | P3 | **Chưa làm**: chỉ có dòng giải thích trong form tạo doanh nghiệp. Khi có API, frontend thêm ô chọn và gửi `model_id` trong `POST /admin/businesses`. |

### Module 6. Quản trị, kênh và thông báo, lịch sử

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 6.1 Danh sách phân hệ | Thiếu | Không có bảng cờ tính năng | **`GET /modules`** (mọi người dùng đã đăng nhập đều đọc, không chỉ admin, vì giao diện ẩn tính năng theo nó) trả `[{id, enabled, updatedAt?}]`, `id` thuộc `planner, recommend, discover, live, sets, sharing`. Nên luôn trả **đủ 6 phân hệ**, kể cả khi chưa ai bật tắt lần nào (mặc định `enabled: true`) | P2 | Trang `/app/admin/modules`; tên, mô tả nằm ở client. Frontend ghép câu trả lời với 6 phân hệ đã biết và coi phân hệ thiếu là bật (`src/api/admin.ts:25-29`). Phân hệ lạ bị bỏ qua. |
| 6.2 Danh sách người dùng | Thiếu | Không có bảng users | `GET /admin/users?q=&role=&status=&page=&page_size=` trả `{items: UserRow[], total, page, pageSize}`; `status` gồm `active, blocked, invited`. Frontend gửi `page_size` 10 và 200 (trang gửi thông báo) | P1 | Trang đã xong (`src/api/admin.ts:68`). |
| 6.3 Tắt phân hệ | Thiếu | Không route nào kiểm cờ | `PATCH /admin/modules/{id} {enabled: false}`; phản hồi tuỳ ý. Backend chặn route của phân hệ đã tắt bằng **403 problem+json, slug `module-disabled`**; không dùng 503 hay 404 trần (frontend sẽ chuyển tính năng đó sang lưu trên máy và phân hệ vẫn chạy). Chỉ chặn được theo route riêng: `sets` → `/poi-sets*`; `sharing` → `/trips/{id}/share`, `/shared/{token}`; `live` → `/trips/{id}/incidents`. `planner`, `recommend`, `discover` dùng chung `/chat`, `/retrieval`, `/routing`, và khung ứng dụng luôn gọi `/retrieval` để tải danh mục (`src/app/AppShell.tsx:251-252`), nên không chặn riêng ở server được; ba phân hệ này chỉ ẩn ở giao diện | P2 | Giao diện ẩn tính năng qua `ModuleGate` (đọc `GET /modules`, cache 60 giây). Frontend chưa xử lý mã `module_disabled`. |
| 6.4 Bật phân hệ | Thiếu | Như 6.3 | `PATCH /admin/modules/{id} {enabled: true}` | P2 | Đã xong. |
| 6.5 Xem tài khoản | Thiếu | Không có | `GET /admin/users/{id}` trả `{user: UserRow, profile: Profile \| null}` (null khi không phải lữ khách); 404 `user_not_found`. Hoạt động lấy riêng ở 6.10 | P1 | Đã xong; lỗi mạng hiện "Chưa tải được", 404 mới hiện "Không tìm thấy". |
| 6.6 Xoá tài khoản | Thiếu | Chưa có chính sách xoá, chặn xoá admin cuối | `DELETE /admin/users/{id}` (204); slug `cannot-act-on-self`, `last-admin` | P1 | Đã xong, xác nhận bằng cách gõ lại email. |
| 6.7 Khoá tài khoản | Thiếu | Không có trạng thái | `POST /admin/users/{id}/block {reason}` (luôn gửi, có thể rỗng; `reason` tối đa 200 ký tự); token đang dùng của người bị khoá phải nhận **401** | P1 | Đã xong; đăng nhập hiện thông báo `account_blocked`. |
| 6.8 Mở khoá | Thiếu | Như 6.7 | `POST /admin/users/{id}/unblock` (frontend vẫn gửi `{reason: ""}`, bỏ qua) | P1 | Đã xong. |
| 6.9 Chọn kênh | Thiếu | Thuộc 6.12 | Kênh gửi lên qua trường `channel` của `POST /admin/notifications` | P3 | Đã xong; form khoá hẳn cho tới khi chọn kênh. |
| 6.10 Lịch sử của mọi người | Thiếu | Không có bảng sự kiện | `GET /admin/activity?type=&date_from=&date_to=&page=&page_size=` và `GET /admin/users/{id}/activity?...` (không dùng `user_id` trên query) trả `{items: ActivityEvent[], total, page, pageSize}`, mới nhất trước; mỗi mục có `userId` **và `userName`**. Nhận sự kiện: `POST /events` | P2 | Trang `/app/admin/activity` và tab hoạt động trong chi tiết người dùng đã xong (`admin.ts:151`); trên điện thoại vào từ trang Tổng quan. |
| 6.11 Xem hồ sơ tài khoản | Thiếu | Không có hồ sơ phía server | Nằm trong `profile` của `GET /admin/users/{id}`; không có `/profile` riêng | P2 | Đã xong. |
| 6.12 Danh sách kênh | Thiếu | Không có | `GET /admin/channels` trả `[{id: in_app\|email\|push, enabled, reason?}]`; `reason` dùng `no-mail-server` hoặc `no-push-server` | P3 | Đã xong. |
| 6.13 Gửi thông báo | Thiếu | Không có hàng đợi, bảng thông báo | `POST /admin/notifications {channel, audience: {kind: "all"} \| {kind: "users", userIds}, titleVi, titleEn, bodyVi, bodyEn, link?}` (camelCase, hai thứ tiếng; `link` bắt đầu bằng `/app`: backend kiểm lại `link` khớp `^/app(/\|$)`; tiêu đề tối đa 120 ký tự, nội dung tối đa 400) trả `SentNotification` (frontend đọc `delivered`); slug `channel-unavailable`. `GET /admin/notifications` trả `SentNotification[]` mới nhất trước | P2 | Đã xong; danh sách chọn người nhận chỉ gồm lữ khách. |
| 6.14 Lịch sử của chính mình | Thiếu | Không có | `GET /me/activity?type=&date_from=&date_to=&page=&page_size=`, cùng dạng 6.10 | P2 | Trang `/app/history` (nút ở trang Tài khoản). |
| 6.15 Nhận thông báo hệ thống | Thiếu | Chưa có thông báo phía server | `GET /me/notifications` trả **mảng trần** `AppNotification[]` (không có `unread_count`, frontend tự đếm). `PATCH /me/notifications/{id} {read: true}` (không phải `/{id}/read`). `DELETE /me/notifications/{id}`. Không cần `read-all`: frontend gửi từng request. Trả tối đa 50 thông báo mới nhất. "Đọc hết" và "xoá hết" gửi cùng lúc một request cho mỗi thông báo (`src/hooks/useNotifications.ts:58,63`); giới hạn tần suất phải chừa đợt này. SSE/Web Push chưa có ở frontend | P2 | Chuông và `/app/notifications` đã gộp thông báo máy chủ với cảnh báo trên máy; hỏi lại mỗi 60 giây; báo lỗi khi đánh dấu hoặc xoá không được. |

Bảng cần thêm (Module 4 đến 7): `businesses(id, name, plan, phone, owner_id, status, created_at)`; `business_places(business_id, poi_id)`; `events(id, user_id, type, t, city, poi_id, trip_id, detail, extra jsonb, created_at)` với khoá duy nhất `(user_id, t, type)` để lô gửi lại không tạo trùng (frontend gửi lại khi không nhận được phản hồi, `src/api/analytics.ts:57-70`); `notifications(id, user_id, kind, title_vi, title_en, body_vi, body_en, link, read_at, created_at, sent_id)`; `sent_notifications(id, sender_id, channel, audience jsonb, title_vi, title_en, body_vi, body_en, link, delivered, created_at)`; `modules(id, enabled, updated_at, updated_by)`; `auth_sessions(token_hash, user_id, remember, expires_at, revoked_at)`; `training_jobs` nếu làm 4.2. `business_places` không đặt khoá ngoại cứng tới `pois`.

### Module 7. Xác thực và khôi phục tài khoản

| UC | Backend | Thiếu gì | API đề xuất (khớp frontend) | Ưu tiên | Frontend hiện nay |
|---|---|---|---|---|---|
| 7.1 Đăng ký | Thiếu | Không có users, băm mật khẩu, kiểm trùng, xác minh antibot | `POST /auth/register {name, email, password, antibot_token}` trả 201 `{user: SessionUser, token}`. Lỗi: 409 `email_taken`, 422 (mật khẩu tối thiểu 6 ký tự như frontend), 429 `rate-limited` + `Retry-After`, `antibot-failed` | P0 | Đã gọi (`src/api/auth.ts:44`). |
| 7.2 Đăng nhập | Thiếu | Không kiểm thông tin, không token, không vai trò, không chống dò mật khẩu | `POST /auth/login {email, password, remember, antibot_token}` trả `{user, token}`. Slug frontend đọc: `invalid_credentials` (401), `account_blocked`, `account_invited`, `antibot-failed`, `rate-limited`. Nên trả `invalid_credentials` cho cả email không tồn tại. `POST /auth/logout` (frontend bỏ qua lỗi) | P0 | Đã gọi, lưu token, gắn `Authorization`; 401 ngoài `/auth/*` thì tự đăng xuất về `/login` (`http.ts:83`). Mỗi nhóm route (đăng nhập, đăng xuất, khôi phục, tài khoản) rơi về chế độ máy khi route chưa có, hoặc khi backend chưa trả lời lần nào trong phiên; sau lần trả lời đầu thì lỗi mạng được báo cho người dùng. |
| 7.3 Xác minh antibot | Thiếu | Không xác minh phía server | Cloudflare Turnstile (widget đọc `VITE_ANTIBOT_SITE_KEY`): gọi `siteverify` với secret trong cấu hình trên `/auth/login`, `/auth/register`; sai/thiếu: slug **`antibot-failed`** (gạch ngang). Khi server **chưa cấu hình secret** (chạy local, CI): bỏ qua bước kiểm và nhận mọi `antibot_token`, kể cả không có. Khi **đã có secret**: bắt buộc, gọi `siteverify`, từ chối token dạng `local-<a>-<b>` (widget sinh khi chưa có site key) và request thiếu token. Bật kiểm ở server mà frontend chưa đặt `VITE_ANTIBOT_SITE_KEY` thì không ai đăng nhập hay đăng ký được: hai khoá phải được đặt cùng lúc. Nút tài khoản mẫu không gửi token: chỉ dùng ở chế độ máy | P1 | Widget đã xong (`src/components/auth/AntibotField.tsx`); cần đặt `VITE_ANTIBOT_SITE_KEY` khi triển khai. |
| 7.4 Ghi nhớ đăng nhập | Thiếu | Không có thời hạn token | Cờ `remember` quyết định thời hạn (ví dụ 1 ngày so với 30 ngày). Frontend chưa dùng refresh token | P1 | Đã nối: gửi `remember`, chọn localStorage hoặc sessionStorage. |
| 7.5 Quên mật khẩu | Thiếu | Không có | Như 5.4 (3 route, kể cả `GET /auth/links/{token}`) | P1 | Đã xong; lỗi khi lưu mật khẩu mới được báo đúng loại (link, mật khẩu không đạt, quá nhiều lần, server lỗi). |
| 7.6 Quên tên đăng nhập | Thiếu | Chưa có khái niệm username (đăng nhập bằng email) | `POST /auth/forgot-username {email}` (cùng phản hồi dù email có hay không); mail nêu tên hiển thị và email đăng nhập | P3 | **Một phần:** có link và form, nhưng vì không có username nên lời nhắc chỉ lặp lại email. Chờ quyết định (mục 7). |
| 7.7 Nhập email | Thiếu | Không chống dò email | Dùng chung `/auth/forgot-password` và `/auth/forgot-username`: luôn cùng phản hồi; giới hạn theo email và IP, 429 + `Retry-After` | P1 | Form dùng chung đã xong; lỗi khi "Gửi lại" hiện ngay trên màn hình. |
| 7.8 Gửi mail xác nhận | Thiếu | Không có mailer, mẫu mail | Mẫu: đặt lại mật khẩu (30 phút), nhắc tài khoản, mời kích hoạt (`/reset-password`, purpose `invite`), xác nhận email mới (`/confirm-email`). Gửi nền; lỗi gửi không lộ ra phản hồi | P1 | Màn "Kiểm tra hộp thư" và nút gửi lại (60 giây) đã xong. |

## 4. Hợp đồng API frontend đã gọi sẵn

Danh sách gồm đủ 67 chỗ gọi `requestJson` trong `src/api` và 4 route backend đã có (mục 4.12, gọi qua `postJson`). Dấu * là path dựng bằng hàm, kể cả `GET /pois?ids=`; vài dòng gộp hai path dùng chung một chỗ gọi (ví dụ `block` và `unblock`). Tất cả đi qua `requestJson`/`remoteOr` trong `src/api/http.ts`.

**Quy tắc dự phòng (nhắc lại, chi tiết ở mục 0):** route trả 404/405 không có slug thì frontend giữ **cả nhóm tính năng đó** trên máy cho tới hết phiên (tên nhóm ở cột cuối). Không có phản hồi (status 0, hết giờ, 502-504) thì chỉ giữ trên máy nếu backend chưa trả lời lần nào trong phiên (phản hồi JSON hoặc 204). Vì vậy backend chỉ được trả 404/405 cho route **chưa có**; 404 cho dữ liệu không tồn tại phải có slug.

"Bỏ qua" nghĩa là frontend không đọc thân phản hồi (204, 200 rỗng hay JSON đều được).

### 4.0 Kiểu dữ liệu dùng chung

| Kiểu | Trường |
|---|---|
| `SessionUser` | `id, name, email, phone?, role: traveler\|admin\|business, avatarUrl?, status?: active\|blocked\|invited, pendingEmail?, businessId?, staffRole?: manager\|planner\|viewer` (camelCase, `src/store/authStore.ts:13-28`) |
| `UserRow` | `SessionUser` + `createdAt?, lastActiveAt?, blockedReason?, trips: number` (`src/api/admin.ts:45`) |
| `Employee` | `SessionUser` + `resources: (dashboard\|places\|reports\|employees)[], createdAt?, lastActiveAt?`; vai trò trong doanh nghiệp đọc ở `staffRole` (`src/api/staff.ts:17`) |
| `Business` | `id, name, ownerId, ownerName, ownerEmail, phone?, plan: starter\|pro, status, createdAt?, employees: number` (`staff.ts:104`) |
| `Page<T>` | `{items: T[], total, page, pageSize}` (`admin.ts:47`) |
| `Profile` | `userId, name, about, pace: slow\|balanced\|fast, interests: {culture?, food?, cafe?, nature?, beach?, market?, nightlife?, adventure?: số 0..1}, dietary: string[], transport: walk\|bike\|taxi, alerts: {traffic, weather, closure, delay: boolean}, saved: string[] (id POI), autoAdjust: boolean` (`src/api/profile.ts:17-30`). `GET` được gộp lên giá trị mặc định nên thiếu trường cũng không sao. |
| `TripDto` | Các trường của `Trip` (`src/domain/types.ts:133-173`) ở camelCase: `id, title, city: sai-gon\|ha-noi\|da-nang\|hue, days: [{index, stops: [{uid, poiId, start, end, visit, travelMin, travelKm, travelCost, mode, wait, locked}]}], budget, dayStart, dayEnd, pace, transport, status: draft\|upcoming\|live\|completed\|cancelled, solver: {status, objective, nodes, ms, model}, request, rainy, version, mustInclude, avoidTags, interests, keywords, extraction?, scheduled?, routing?, stopsPerDay?, autoTitle?, cancelledAt?, cancelReason?, clonedFrom?`; **riêng** 3 trường snake_case: `user_id, start_date, created_at` (`src/api/trips.ts:13-15`). Giờ (`start`, `end`, `dayStart`, `dayEnd`) là số phút từ 00:00. |
| `Share` | `{token, tripId, createdAt, ownerName}` (`src/api/shares.ts:9`) |
| `PoiSetDto` | `{id, user_id, name, description, poi_ids: string[] (theo thứ tự), created_at, updated_at}` (snake_case, `src/api/poiSets.ts:21`) |
| `PoiReport` | `{id, poiId, userId, type: closed\|hours\|address\|other, note, at, status: open\|resolved}` (camelCase, `src/api/poiReports.ts:8`) |
| `Incident` | `{id, kind: traffic\|weather\|closure\|delay, severity: minor\|major, affected_stop_ids: string[], delay_minutes?, until? (phút từ 00:00), poi_id? (bắt buộc với closure), message?}` (`src/api/incidents.ts:9-20`) |
| `AppNotification` | `{id, kind: traffic\|closure\|weather\|delay\|info\|success\|announcement, vi, en, bodyVi?, bodyEn?, at, read, to? (đường dẫn trong app)}` (`src/store/notificationStore.ts:6-18`); `vi`/`en` là tiêu đề |
| `AnalyticsEvent` | `{t (ISO), type, userId?, city?, reason?, lambda?, detail?, poiId?, tripId?, days?, stops?, budget?, poiIds?}` (`src/api/analytics.ts:30-48`). `type` thuộc 21 giá trị: `trip_created, trip_saved, trip_edited, trip_started, trip_cancelled, trip_completed, trip_shared, trip_cloned, replan_suggested, replan_accepted, replan_dismissed, replan_auto, edit_rejected, search, poi_opened, poi_saved, poi_reported, set_created, set_deleted, login, account_updated` |
| `ActivityEvent` | `AnalyticsEvent` + `userName?` (`admin.ts:139`) |
| `Stats` | `{kpis: [{id, value}], series: [{date: YYYY-MM-DD, created, edited, replans}], places: [{poiId, name, cat, trips, saves, reports}], categories: [{cat, count}], cities: [{city, count}], funnel: {suggested, accepted, dismissed, auto}}` (`admin.ts:167-175`) |
| `ItineraryRow` | `{id, userId, userName, city, days, stops, budget, status, createdAt}` (`admin.ts:298`) |
| `TrainingJob` | `{id, status: queued\|running\|succeeded\|failed, progress (0..1), modelVersion?, metrics?: {tên: số}, error?, startedAt, finishedAt?}` (`admin.ts:314`) |
| `Channel` | `{id: in_app\|email\|push, enabled, reason?: no-mail-server\|no-push-server}` (`src/api/notifications.ts:43`) |
| `SentNotification` | thân `POST /admin/notifications` + `{id, at, delivered: number, senderId}` (`notifications.ts:64`) |

### 4.1 Xác thực (Module 7)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm dự phòng |
|---|---|---|---|---|---|
| POST | `/auth/login` | `{email, password, remember, antibot_token}` | `{user: SessionUser, token}` | `src/api/auth.ts:27` | `auth` |
| POST | `/auth/register` | `{name, email, password, antibot_token}` | `{user: SessionUser, token}` | `auth.ts:44` | `auth` |
| POST | `/auth/logout` | `{}` | bỏ qua | `auth.ts:57` | `auth-logout` |
| POST | `/auth/forgot-password` | `{email}` | bỏ qua | `auth.ts:69` | `auth-recovery` |
| POST | `/auth/forgot-username` | `{email}` | bỏ qua | `auth.ts:83` | `auth-recovery` |
| GET | `/auth/links/{token}` | | `{purpose: reset\|invite\|email, email}`; lỗi `link-invalid`, `link-expired` | `auth.ts:105` | `auth-recovery` |
| POST | `/auth/reset-password` | `{token, password}` | bỏ qua | `auth.ts:116` | `auth-recovery` |

### 4.2 Tài khoản của tôi (Module 5)

Nhóm dự phòng `account`, nhưng nếu đăng nhập đang chạy trên máy (`auth`) thì các route này cũng chạy trên máy.

| Method | Path | Thân gửi | Phản hồi frontend đọc | File |
|---|---|---|---|---|
| PATCH | `/me` | `{name, phone: E.164 \| null}` | `SessionUser` | `auth.ts:156` |
| POST | `/me/email` | `{email, password}` | `{pending_email}` | `auth.ts:167` |
| POST | `/me/email/confirm` | `{token}` (có thể không có `Authorization`) | `SessionUser` | `auth.ts:185` |
| POST | `/me/password` | `{current_password, new_password}` | bỏ qua | `auth.ts:203` |
| POST | `/me/avatar` | multipart, trường `file` (`avatar.webp`) | `SessionUser` (`avatarUrl` tuyệt đối) | `auth.ts:221` (nhóm `avatar`) |
| DELETE | `/me/avatar` | | `SessionUser` | `auth.ts:229` (nhóm `avatar`) |

### 4.3 Hồ sơ (Module 5)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/me/profile` | | `Profile` | `src/api/profile.ts:57` | `profile` |
| PUT | `/me/profile` | `Profile` đầy đủ | bỏ qua (nên trả `Profile`) | `profile.ts:62` | `profile` |

### 4.4 Chuyến đi, chia sẻ, sự cố (Module 2, 3)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/trips` | | mảng trần `TripDto[]` | `src/api/trips.ts:34` | `trips` |
| GET | `/trips/{id}` | | `TripDto`; 404 slug `trip-not-found` | `trips.ts:44` | `trips` |
| POST | `/trips` | `TripDto` (có `id` do frontend sinh, `version: 1`) | `TripDto` | `trips.ts:59` | `trips` |
| PUT | `/trips/{id}` | `TripDto` (version bản đang sửa) | `TripDto` với `version + 1`; 409 khi lệch | `trips.ts:71` | `trips` |
| DELETE | `/trips/{id}` | | bỏ qua | `trips.ts:128` | `trips` |
| GET | `/trips/{id}/share` | | `Share \| null` (200) | `src/api/shares.ts:27` | `shares` |
| POST | `/trips/{id}/share` | `{}` | `Share` | `shares.ts:34` | `shares` |
| DELETE | `/trips/{id}/share` | | bỏ qua | `shares.ts:48` | `shares` |
| GET | `/shared/{token}` | (công khai) | `{trip: TripDto, ownerName, createdAt}`; 404 `link-invalid` | `shares.ts:62` | `shares` |
| GET | `/trips/{id}/incidents` | | mảng trần `Incident[]` | `src/api/incidents.ts:27` | `incidents` |

### 4.5 Bộ sưu tập địa điểm (Module 1)

Nhóm dự phòng `poi-sets`. Slug lỗi: `set-name-required`, `set-name-too-long`, `set-name-taken`, `set-full`, `poi-not-found`, `set-not-found`.

| Method | Path | Thân gửi | Phản hồi frontend đọc | File |
|---|---|---|---|---|
| GET | `/poi-sets` | | `PoiSetDto[]` | `src/api/poiSets.ts:64` |
| GET | `/poi-sets/{id}` | | `PoiSetDto` | `poiSets.ts:74` |
| POST | `/poi-sets` | `{name, description, poi_ids}` | `PoiSetDto` | `poiSets.ts:91` |
| PATCH | `/poi-sets/{id}` | `{name?, description?, poi_ids?}` (`poi_ids` thay cả danh sách) | `PoiSetDto` | `poiSets.ts:106` |
| POST | `/poi-sets/{id}/items` | `{poi_ids}` | `PoiSetDto` | `poiSets.ts:125` |
| DELETE | `/poi-sets/{id}/items/{poi_id}` | | `PoiSetDto` (không 204) | `poiSets.ts:132` |
| DELETE | `/poi-sets/{id}` | | bỏ qua (xoá mềm) | `poiSets.ts:140` |
| POST | `/poi-sets/{id}/restore` | `{}` | `PoiSetDto` | `poiSets.ts:151` |

### 4.6 Địa điểm theo id và báo cáo (Module 1)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/pois?ids=a,b,c` * | | `PoiCard[]` (hoặc `null`, đọc là rỗng); id lạ bỏ qua, không 404 | `src/api/catalog.ts:108` | `pois-by-id` |
| POST | `/pois/{id}/reports` | `{type: closed\|hours\|address\|other, note}` | chỉ đọc `id` nếu có | `src/api/poiReports.ts:25` | `poi-reports` |
| GET | `/admin/poi-reports` | | `PoiReport[]` mới nhất trước | `poiReports.ts:32` | `poi-reports` |
| PATCH | `/admin/poi-reports/{id}` | `{status: "resolved"}` | bỏ qua | `poiReports.ts:39` | `poi-reports` |

`GET /pois?ids=`: công khai, không cần token. Frontend chỉ gửi id nó chưa biết, không trùng, nối bằng dấu phẩy, mỗi id đã mã hoá URL, tối đa 100 id mỗi lần, các lần gọi nối tiếp nhau, hết giờ sau 12 giây. Mỗi phần tử đi qua `poiFromCard` (`src/domain/poiFromCard.ts`), đọc các trường `id, name, kind, category, ward, address, lat, lon, opening_hours_raw, price_raw, website, phone, score, flags`, cùng dạng `PoiCard` của `/retrieval`. 404/405 trần: frontend không gọi lại trong phiên. Lỗi khác bị bỏ qua, địa điểm đó hiện "Địa điểm chưa tải được".

### 4.7 Thông báo (Module 3, 6)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/me/notifications` | | mảng trần `AppNotification[]` | `src/api/notifications.ts:19` | `notifications` |
| PATCH | `/me/notifications/{id}` | `{read: true}` | bỏ qua | `notifications.ts:31` | `notifications` |
| DELETE | `/me/notifications/{id}` | | bỏ qua | `notifications.ts:38` | `notifications` |
| GET | `/admin/channels` | | `Channel[]` | `notifications.ts:49` | `channels` |
| GET | `/admin/notifications` | | `SentNotification[]` | `notifications.ts:69` | `notifications-admin` |
| POST | `/admin/notifications` | `{channel, audience, titleVi, titleEn, bodyVi, bodyEn, link?}`; lỗi `channel-unavailable` | `SentNotification` | `notifications.ts:77` | `notifications-admin` |

### 4.8 Phân hệ và người dùng (Module 6)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/modules` | | `[{id, enabled, updatedAt?}]` | `src/api/admin.ts:29` | `modules` |
| PATCH | `/admin/modules/{id}` | `{enabled}` | bỏ qua | `admin.ts:34` | `modules` |
| GET | `/admin/users?q=&status=&role=&page=&page_size=` * | | `Page<UserRow>` | `admin.ts:68` | `admin-users` |
| GET | `/admin/users/{id}` | | `{user: UserRow, profile: Profile \| null}`; 404 `user_not_found` | `admin.ts:86` | `admin-users` |
| POST | `/admin/users/{id}/block`, `/admin/users/{id}/unblock` | `{reason}` | bỏ qua; slug `cannot-act-on-self`, `last-admin` | `admin.ts:108` | `admin-users` |
| DELETE | `/admin/users/{id}` | | bỏ qua; slug như trên | `admin.ts:121` | `admin-users` |

### 4.9 Doanh nghiệp và nhân viên (Module 4, 5)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/business/employees?q=&status=&page=&page_size=` * | | `Page<Employee>` | `src/api/staff.ts:29` | `employees` |
| POST | `/business/employees` | `{name, email, phone, role, resources}`; 409 `email_taken` | `Employee` | `staff.ts:47` | `employees` |
| POST | `/business/employees/{id}/block`, `/unblock` | `{}` | `Employee` | `staff.ts:84` | `employees` |
| PATCH | `/business/employees/{id}` | `{role, resources}` | `Employee` | `staff.ts:91` | `employees` |
| DELETE | `/business/employees/{id}` | | bỏ qua | `staff.ts:98` | `employees` |
| GET | `/admin/businesses` | | `Business[]` | `staff.ts:109` | `businesses` |
| POST | `/admin/businesses` | `{company_name, owner_name, owner_email, phone, plan}`; 409 `email_taken` | `Business` | `staff.ts:135` | `businesses` |
| GET | `/business/places` | | `string[]` | `src/api/admin.ts:283` | `business-places` |
| PUT | `/business/places` | `{poi_ids}` | `string[]` | `admin.ts:288` | `business-places` |

### 4.10 Sự kiện và lịch sử hoạt động (Module 4, 6)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| POST | `/events` | `{events: AnalyticsEvent[]}` | bỏ qua | `src/api/analytics.ts:63` | `events` |
| GET | `/me/activity?type=&date_from=&date_to=&page=&page_size=` * | | `Page<ActivityEvent>` | `src/api/admin.ts:151` | `activity` |
| GET | `/admin/activity?...` (cùng tham số) * | | `Page<ActivityEvent>` (có `userName`) | `admin.ts:151` | `activity` |
| GET | `/admin/users/{id}/activity?...` * | | `Page<ActivityEvent>` | `admin.ts:151` | `activity` |

### 4.11 Thống kê, báo cáo, dữ liệu, huấn luyện (Module 4)

Bộ lọc chung: `date_from`, `date_to` (YYYY-MM-DD), `city`, `category`; tham số "tất cả" không được gửi.

`category` (tham số) và `cat` (trong `places`, `categories`) dùng 8 mã của frontend: `culture, food, cafe, nature, beach, market, nightlife, adventure`, không phải taxonomy `top.sub` của bảng `pois`. Quy đổi như `categoryOf` (`src/domain/poiFromCard.ts:57-67`): `food.cafe` → `cafe`; `food.*` còn lại → `food`; `entertainment.nightlife`, `entertainment.cinema` → `nightlife`; `nature.*` → `nature`; `shopping.*` → `market`; `attraction.*`, `culture*`, `entertainment.*` còn lại → `culture`. Hiện chưa có điểm nào thuộc `beach`, `adventure`. `city` (tham số và trong `cities`) dùng mã `sai-gon, ha-noi, da-nang, hue`; cột `pois.city` đang ghi "Thành phố Hồ Chí Minh", "Thành phố Hà Nội". `Stats` nên luôn có đủ 6 khoá (`kpis, series, places, categories, cities, funnel`); không có số liệu thì trả mảng rỗng và `funnel` toàn 0. Frontend tự điền khoá thiếu bằng mảng rỗng và 0 (`src/api/admin.ts:246-260`) nên thiếu khoá không làm hỏng trang, nhưng số liệu sẽ trống.

| Method | Path | Thân gửi | Phản hồi frontend đọc | File | Nhóm |
|---|---|---|---|---|---|
| GET | `/admin/stats?...` | | `Stats` | `src/api/admin.ts:256` | `admin-stats` |
| GET | `/business/stats?...` | | `Stats` (KPI riêng) | `admin.ts:260` | `business-stats` |
| GET | `/admin/report?...&format=csv`, `/business/report?...&format=csv` | | `{url}` (link ký sẵn, tuyệt đối, CORS GET, tải không kèm token, CSV UTF-8; `text/html` bị coi là lỗi) | `admin.ts:267` | `admin-export`, `business-export` |
| GET | `/admin/itineraries?date_from=&date_to=&city=` | | `ItineraryRow[]` | `admin.ts:303` | `admin-itineraries` |
| POST | `/admin/train` | `{}` | `TrainingJob` | `admin.ts:317` | không có dự phòng |
| GET | `/admin/train/{id}` | | `TrainingJob` | `admin.ts:318` | không có dự phòng |
| GET | `/admin/train` | | `TrainingJob[]` | `admin.ts:319` | không có dự phòng |

### 4.12 Route backend đã có (không có dự phòng trên máy)

| Method | Path | Thân gửi | Phản hồi frontend đọc | File |
|---|---|---|---|---|
| POST | `/chat` | `{text}` (không được rỗng) | `{extraction, ...}` | `src/api/extraction.ts:12` |
| POST | `/retrieval` | `{extraction, limit (20, hoặc 8 ở trang gợi ý), section?, offset?, seed?}`; `selected_ids` có trong kiểu nhưng chưa gửi | `{status, pinned, disambiguation, not_found, sections, warnings, meta}` | `src/api/catalog.ts:22` |
| POST | `/routing/days` | `{places: PoiCard[], must_visit_ids, start: {lat, lon}, start_at, end_at, day_start, day_end, pins: [{id, date}]}` | `{days: [{date, places, busy_minutes, capacity_minutes}], unscheduled, open_dates, warnings, meta}` | `src/api/routing.ts:92` |
| POST | `/routing` | như `/routing/days` | `{days: [{date, stops: [{poi, start, leave, wait_minutes, visit_minutes, leg}]}], unscheduled, warnings, meta}` | `routing.ts:120` |

### 4.13 Route frontend KHÔNG gọi (các bản đề xuất cũ có ghi)

`GET /auth/me`, `PUT /me/preferences`, `POST /trips/{id}/start|complete|cancel|position`, `GET /trips/{id}/progress`, `POST /routing/replan`, `GET /trips/{id}/edit-requests`, `POST /edit-requests/{id}/accept|reject`, `POST /trips/{id}/clone`, `POST /shared/{token}/clone`, `GET /admin/stats/timeseries|top|distribution`, `GET /admin/itineraries/export`, `GET /business/employees/{id}`, `PATCH /business/employees/{id}/role`, `GET /business/roles`, `GET /business/resources`, `GET /admin/users/{id}/profile`, `PATCH /me/notifications/{id}/read`, `POST /me/notifications/read-all`, `GET /admin/models`. Làm hay không là tuỳ nhóm backend; nếu làm thì báo để frontend nối.

### 4.14 Slug lỗi frontend đang so khớp

Gạch ngang: `antibot-failed`, `rate-limited`, `link-invalid`, `link-expired`, `set-name-required`, `set-name-too-long`, `set-name-taken`, `set-full`, `poi-not-found`, `set-not-found`, `cannot-act-on-self`, `last-admin`, `channel-unavailable`, `llm-timeout`, `llm-rate-limited`, `llm-upstream-error`, `invalid-llm-output`, `retrieval-not-configured`, `retrieval-db-unavailable` (backend đang trả; frontend so khớp ở `src/api/errorText.ts:16`), `trip-not-found`.
Gạch dưới: `email_taken`, `invalid_credentials`, `account_blocked`, `account_invited`, `user_not_found`.
Mọi slug chứa `not-found` hoặc `not_found` được coi là "không tìm thấy" (`src/api/errorText.ts:9`). `llm-not-configured` (`app/api/routes/chat.py:25`) frontend chưa có câu riêng.
Frontend đọc theo mã HTTP: 401 (đăng xuất khi gặp ở route ngoài `/auth/*`, `src/api/http.ts:83`), 409 (`PUT /trips`), 403, 404, 422, 429.

## 5. Lỗi backend đợt trước: kiểm lại

Kiểm lại trên commit `d646272` (không có commit mới hơn), có gọi thử server chạy ở `:8000` (`/retrieval`, `/routing`, `/routing/days`; không gọi `/chat`). Server đang dùng bộ dữ liệu `places_1000` (1.000 điểm, chỉ TP.HCM). Kết quả: **25/26 mục còn mở, A5 mở một phần**. Tỉ lệ ở C3, C4 lấy từ mẫu ngẫu nhiên cố định nên có thể xê dịch.

Số liệu bộ dữ liệu mới (repo dữ liệu Journie-Data, thư mục `places_1000/`): `places_vn_verified.parquet` có **1.376 điểm** (TP.HCM 1.254, Hà Nội 122, đều kiểm "strong"), 264 điểm `hours_contradicted`, 355 điểm không có giờ, `expected_visit_duration_min` có đủ cho cả 1.376 điểm; `places_hcm_verified.parquet` có 1.254 điểm. Chạy thử `scripts/import_parquet.py --dry-run` cả hai file đều qua kiểm taxonomy (1 cảnh báo giờ không đọc được: `monkee-shisha-house-a2745f`).

### P0 (làm hỏng lịch trình hoặc cho thấy dữ liệu sai)

| Mục | Còn mở | Tình trạng |
|---|---|---|
| A1 | Có | Database vẫn là `places_1000` (1.000 điểm, chỉ TP.HCM; `meta.data_version` trả `places_1000`). **Bước 1 nhập `places_hcm_verified.parquet` (1.254 điểm)** bằng `scripts/import_parquet.py`, thử trước trên schema riêng (`--schema`). Chỉ nhập `places_vn_verified.parquet` (1.376 điểm, thêm 122 điểm Hà Nội) **sau khi xong B1 đến B4**: `ELIGIBLE` chưa lọc `city` (`retrieval/candidates.py:35-39`) và 122 điểm Hà Nội đều có `outside_region = false`, nên nhập sớm sẽ trộn Hà Nội vào gợi ý TP.HCM, kể cả trang Gợi ý của frontend (`src/components/recommend/RetrievalResults.tsx:74` không lọc theo thành phố). Đọc D1 trước khi dùng `--prune`. |
| A2 | Có | Routing vẫn tin giờ của điểm `hours_contradicted` (`app/services/routing/service.py:205`, không đọc cờ này) nên có thể loại nhầm với `closed_on_trip_days`. Bộ mới có 264/1.376 điểm như vậy (DB hiện chỉ 16/1.000), lỗi sẽ tăng mạnh sau khi nhập. Điểm **không có giờ** thì đã được coi là mở cả ngày kèm cảnh báo `hours_unknown` (`service.py:103-115`), phần này không cần sửa. Cần: coi điểm contradicted như chưa rõ giờ và thêm cảnh báo `hours_contradicted:<id>`. |
| C1 | Có | `plan_cost` (`service.py:252`) và `busy_seconds` (`service.py:246`) không tính thời gian chờ. Chạy lại: 12 điểm/2 ngày có chỗ chờ 287 và 185 phút; 24 điểm/3 ngày chờ 172 phút. |
| C2 | Có | Chi phí cân bằng chỉ so max-min (`service.py:265`). Chạy lại 50 điểm/14 ngày: số điểm mỗi ngày `[0,8,8,7,8,6,0,0,7,6,0,0,0,0]`, 7 ngày trống, không có cảnh báo, ngày đầu cũng trống. |
| C3 | Có | 1/10 lần `/routing` bỏ một điểm (`no_time`) mà `/routing/days` vừa xếp (40 điểm/2 ngày, tải 772 và 775/780 phút). Solver chạy ILS từ đầu (`service.py:272-298`) thay vì từ thứ tự client gửi khi mọi điểm đã ghim. |
| C4 | Có | 2/12 lần báo `no_time` sai khi ngày còn trống (một ca hai ngày kết thúc 17:27 và 16:13 trong khung tới 21:00, điểm bị bỏ là một quán bar). Sau `rebalance` (`service.py:288`, `ils.py:228`) chưa có lượt chèn lại điểm chưa xếp. |

### P1 (cần cho tính năng mới)

| Mục | Còn mở | Tình trạng |
|---|---|---|
| A3 | Có | Chưa lưu, chưa dùng `expected_visit_duration_min` (không có trong `db/schema.sql`, `retrieval/ingest.py:60-135`; `service.py:204` chỉ dùng theo loại). Thêm cột, đọc khi nhập, thứ tự ưu tiên: request > cột > theo loại. |
| A4 | Có | `app/services/routing/config/visit_minutes.yaml` vẫn là `visit-minutes-v0` (20 loại). Chép `visit_minutes.v1.yaml` (25 loại) đè lên: 20 loại cũ giữ nguyên số, thêm `attraction.viewpoint`, `attraction.zoo`, `culture_religion.mosque`, `food.food_court`, `food.street_food` (hiện rơi về mặc định 40 phút). |
| A5 | Một phần | Cột `city`, `outside_region` đã có trong schema và được lưu khi nhập (`ingest.py:100-101`), nhưng chưa chỗ nào lọc theo `city`. Dữ liệu mới có Hà Nội (122 điểm); vẫn chưa có Đà Nẵng, Huế. Còn thiếu B1 đến B4. |
| B1 | Có | `SUPPORTED_DESTINATION = "Ho Chi Minh City"` (`retrieval/service.py:27`) chặn mọi điểm đến khác (thử "Hanoi" trả `unsupported_destination`). Cần nhận nhiều điểm đến, nhất là khi đã có 122 điểm Hà Nội. |
| B2 | Có | `ELIGIBLE` (`retrieval/candidates.py:35-39`) chưa lọc `city`; nhập Hà Nội vào cùng bảng sẽ trộn vào gợi ý TP.HCM, nên chỉ nhập `places_vn_verified.parquet` sau khi xong B1 đến B4 (xem A1). |
| B3 | Có | `names.lookup` (`retrieval/names.py:72`) chỉ lọc `recommendable`, không lọc `city` lẫn `outside_region`; `fetch_by_ids` (`candidates.py:70-77`) cũng không lọc. Tên trùng giữa hai thành phố sẽ mơ hồ hoặc nhầm thành phố. |
| B4 | Có | `PoiCard` chưa có `city` (`app/schemas/retrieval.py:63-79`), `POI_COLUMNS` (`poi.py:9-32`) không select `city`. Thêm `city` có giá trị mặc định để request cũ không bị 422 (frontend gửi lại `PoiCard` trong `/routing`). |
| B6 | Có | `--prune` xoá mọi id không có trong file (`scripts/import_parquet.py:112-114`), không theo `city`. Nhập riêng từng thành phố với `--prune` sẽ xoá thành phố kia; dùng file `places_vn_verified` (cả hai thành phố) hoặc thêm điều kiện `city`. |
| C6 | Có | `app/core/errors.py:61-65` chỉ có handler cho `ProblemError`. Cần: handler cho `RequestValidationError` trả `application/problem+json` (slug `validation-error`, `detail` là chuỗi giữ nguyên câu của validator vì frontend đang dò chữ `day_end`, `src/api/errorText.ts:23`) và **không kèm `input`**: hiện 422 còn trường `input` chứa cả request, với `/auth/register`, `/auth/login`, `/me/password` trường này lặp lại mật khẩu trong phản hồi lỗi. Lỗi nghiệp vụ của route mới dùng `ProblemError`, không `raise HTTPException`. **Không** đăng ký handler chung biến mọi `HTTPException` thành problem+json: 404/405 do router sinh cho path, method chưa có phải giữ nguyên `{"detail": "Not Found"}` không có `type`, nếu không cơ chế dự phòng ở mục 0 ngừng chạy và mọi tính năng chưa làm sẽ báo lỗi. |
| C7 | Có | Chưa có `max_places_per_day` (`app/schemas/routing.py:30-70`); gửi lên vẫn 200 và bị bỏ qua. 24 điểm/3 ngày vẫn xếp 8 điểm mỗi ngày, vượt mức 6 người dùng chọn. |
| C8 | Có | Không có khung giờ ăn (`config/rules.yaml:5-13`, `rules.py`); chạy lại có nhà hàng xếp lúc 09:02. Luật `not_adjacent: food` vẫn cấm cà phê liền sau bữa ăn. Cần khung trưa/tối cho `food.restaurant` và bỏ cấm liền kề với cà phê. |
| C9 | Có | Chưa nhận `visit_minutes` theo điểm (`service.py:204` luôn lấy theo loại); trường thừa bị bỏ qua im lặng. |
| C10 | Có | Chưa có `keep_order`; solver vẫn sắp lại cả khi mọi điểm đã ghim (`service.py:272`). |
| D1 | Có (số đã đổi) | Nhập bộ mới (vn hay hcm) làm mất **590** id cũ trong 1.000 (báo cáo cũ ghi 613). Trong mẫu 217 điểm đang được gợi ý, 117 điểm (54%) không còn trong bộ mới. Chuyến đã lưu chứa các id này sẽ nhận `not_found` (`service.py:195-200`). Cần xuất danh sách id bị bỏ và chốt cách xử lý trước khi `--prune`. Vì vậy các bảng mới không đặt khoá ngoại cứng tới `pois.id` (ghi chú dưới bảng Module 1). |
| D2 | Có | `db/schema.sql` chưa có chỉ mục `city`, chưa có cột `expected_visit_duration_min`; `DATA_INFO_SQL` (`candidates.py:133-135`) lấy `max(data_version)` toàn bảng, không theo thành phố. |
| D4 | Có | Test hiện có không phủ mục nào còn mở (chờ, ngày trống, `/routing` sau `/routing/days`, 422 problem+json, `city`, `hours_contradicted`); `tests/test_retrieval_api.py:37-41` còn khẳng định luật chỉ TP.HCM. Thêm test đi kèm từng sửa. |

### P2 (cải thiện)

| Mục | Còn mở | Tình trạng |
|---|---|---|
| B5 | Có | Câu cảnh báo vẫn cố định chữ TP.HCM (`retrieval/service.py:112,116`). |
| C5 | Có | Khung ngày 12:00 đến 12:30 với 10 điểm trả cả 10 `closed_on_trip_days` (`service.py:210-211`). Cần trả `no_time` khi điểm có mở nhưng khung ngày ngắn hơn thời gian tham quan. |
| C11 | Có | `meta` của routing chỉ có 5 trường; chưa trả `walk_kmh`, `ride_kmh`, `walk_threshold_km`, `detour_factor` (hằng số ở `service.py:55-57`). |
| D3 | Có | Chú thích và tài liệu cũ: `app/schemas/routing.py:16`, `app/api/routes/routing.py:39`, `docs/API.md:57,432`, `candidates.py:23-26` (ngưỡng `MIN_CONFIDENCE` đo trên bộ cũ, cần đo lại). |

### Vấn đề mới phát hiện khi kiểm lại

| Mục | Ưu tiên | Vấn đề |
|---|---|---|
| E1 | P0 | Không có CORS (`app/main.py:30-34`); `OPTIONS /routing` trả 405. Trình duyệt ở origin khác không gọi được; hiện chỉ chạy qua proxy của Vite. |
| E2 | P0 | Không có xác thực, phân quyền, giới hạn tần suất ở route nào. `POST /chat` gọi Gemini trả phí bằng key của server, chỉ giới hạn 4.000 ký tự (`app/schemas/extraction.py:86-88`); ai cũng dùng hết hạn mức được. |
| E3 | P1 | Mỗi request `/routing`, `/routing/days` chạy ILS tới 6 giây (`app/core/config.py:30`) trong thread pool mặc định, pool DB tối đa 3 (`config.py:21-22`), không giới hạn số request đồng thời; vài request cùng lúc làm nghẽn. Backend cho tới 50 điểm x 14 ngày. Phải xong trước khi `/trips` dùng chung pool: `/routing` giữ một kết nối suốt lúc giải (`service.py:342,383`), hết pool thì request CRUD chờ 10 giây rồi nhận 503; nếu lúc đó backend chưa trả lời lần nào trong phiên thì frontend chuyển `trips` sang lưu trên máy (mục 0). |
| E4 | P1 | Điểm không có giờ được coi là mở cả ngày nên quán bar, karaoke bị xếp buổi sáng (chạy thử có `entertainment.nightlife` lúc 08:17 và 10:04). Bộ mới có 355/1.376 điểm không giờ; nên đặt giờ mặc định theo loại. |
| E5 | P1 | Chưa cấu hình `OSRM_URL` (`config.py:28`): mọi kết quả đều `travel_source=estimated` (đường thẳng x 1,3). |
| E6 | P1 | Server dev chạy bộ cũ nên mọi luồng Hà Nội ở frontend đều bị chặn cho tới khi xong A1 và B1 đến B4. |
| E7 | P2 | Trường thừa trong request bị bỏ qua im lặng (`max_places_per_day`, `keep_order` vẫn 200). Nên dùng `extra='forbid'` hoặc trả danh sách tính năng trong `meta`, để frontend biết trường mới chưa được nhận. |
| E8 | P2 | File `a.json` (bản dump của `/retrieval`) đang được git theo dõi ở gốc repo; nên xoá. |

## 6. Thứ tự làm đề xuất

0. **CORS (E1):** vài dòng cấu hình, cần cho mọi lần gọi khác origin, làm ngay.
1. **Dữ liệu và routing (P0):** A1 với file `places_hcm_verified.parquet` (đọc D1 trước), A2, C1 đến C4, E4. Dữ liệu sai thì mọi phép đo sau đều sai.
2. **Nền tảng (mục 3.0, Module 7):** bảng `users`, `/auth/*` gồm `GET /auth/links/{token}`, quên và đặt lại mật khẩu, antibot (7.3), `remember` (7.4), token Bearer, danh sách route công khai và kiểm chủ sở hữu, giới hạn tần suất cho `/auth/*` và `/chat` (E2), lỗi problem+json có slug (C6), mailer, cách tạo tài khoản admin đầu tiên. Không có phần này thì Module 2, 3, 5, 6 không thể có thật.
3. **Lưu lịch trình (Module 2, 3):** E3 trước (hạn chế `/routing` chiếm pool DB). Rồi `GET/POST/PUT/DELETE /trips` với `version` và 409, kiểm dữ liệu `TripDto`, `share`, `GET /shared/{token}`, và `GET /pois?ids=` (1.3; chuyến và link chia sẻ chỉ lưu id địa điểm). Người dùng thấy ngay (mất dữ liệu khi đổi máy). Bắt đầu, xong, huỷ, chấp nhận đổi lịch (2.12, 2.21, 3.1, 3.8, 3.9) đều đi qua `PUT /trips/{id}`, không cần route riêng.
4. **Hồ sơ, tài khoản và quản lý người dùng:** `/me`, `/me/profile`, avatar, đổi email, đổi mật khẩu (5.1 đến 5.8); `GET /admin/users`, xem, khoá, mở khoá, xoá tài khoản (6.2, 6.5 đến 6.8).
5. **Bộ sưu tập (Module 1):** `/poi-sets` (8 route), `/pois/{id}/reports`, rồi `GET /pois?city=` (1.7), `/pois/search`.
6. **Chất lượng routing mới (P1):** A3, A4, C7, C8, C9, C10, E5.
7. **Nhiều thành phố:** A5, B1 đến B4, B6, D2 (song song với bước 3 đến 5 nếu nhóm dữ liệu sẵn sàng); sau đó nhập `places_vn_verified.parquet`. E6 tự hết sau A1 và B1 đến B4.
8. **Sự kiện và quản trị (Module 4, 6, phần còn lại của 5):** `POST /events`, `GET /modules` và `PATCH /admin/modules`, lịch sử, thông báo, thống kê, doanh nghiệp, nhân viên. 5.18 (P3) và 4.2 chỉ làm nếu nhóm quyết định làm (mục 7).
9. **Theo dõi chuyến nâng cao (Module 3, P2):** `GET /trips/{id}/incidents` cùng bộ phát hiện phía server (3.3), xếp lại một phần (2.17, 3.4), Web Push và đề xuất đổi lịch (3.5, 3.6).
10. **Dọn dẹp:** C5, C11, B5, D3, E7, E8; D4 (test) làm xuyên suốt, không để cuối.

## 7. Câu hỏi mở cho nhóm

1. **Username (UC 7.6):** có thêm username không? Nếu không, đổi UC 7.6 thành "nhắc email đăng nhập" (frontend đang làm vậy) hoặc bỏ UC. Nếu bỏ thì frontend xoá link "Quên tên đăng nhập".
2. **Nhà cung cấp antibot (UC 7.3):** frontend đã dùng Cloudflare Turnstile. Nhóm có đồng ý không (cần site key và secret)?
3. **"Tài nguyên" trong UC 5.16:** frontend chốt tạm 4 giá trị `dashboard`, `places`, `reports`, `employees`. Có đúng ý sơ đồ không? Backend sẽ áp quyền theo `role` + `resources` thế nào, và nhân viên đăng nhập vào trang doanh nghiệp với vai trò gì?
4. **Ai gán địa điểm cho doanh nghiệp (UC 4.4):** hiện doanh nghiệp tự chọn qua `PUT /business/places`, nghĩa là xem được số liệu của nơi bất kỳ. Nên để admin gán?
5. **Kiểu tên trường:** giữ đúng như mục 4 (đang lẫn snake_case và camelCase) hay thống nhất một kiểu? Nếu đổi, frontend sửa ở các file `src/api/*` theo hợp đồng mới.
6. **Id chuyến đi:** backend giữ `id` frontend sinh (đề xuất) hay tự sinh? Frontend đã đọc `id` trong phản hồi, nên cả hai đều chạy, nhưng cần chốt để link chia sẻ và lịch sử khớp.
7. **Xoá mềm hay xoá hẳn:** tài khoản nhân viên (UC 5.12, giao diện đang nói "không lấy lại được"), người dùng (UC 6.6), chuyến đi (UC 2.3).
8. **Đề xuất đổi lịch (UC 3.6 đến 3.8):** giữ trên máy (như hiện tại) hay làm thực thể phía server cùng bộ phát hiện sự cố và Web Push?
9. **Thời tiết (UC 2.10):** có nguồn thời tiết thật không, hay ghi rõ là ngoài phạm vi? Hiện frontend dùng giá trị giả.
10. **Mô hình riêng (UC 5.18) và huấn luyện (UC 4.2):** có làm trong đợt này không? Nếu không, ghi "ngoài phạm vi" trong báo cáo đồ án.
11. **Đà Nẵng, Huế:** giao diện có 4 thành phố nhưng dữ liệu mới chỉ có TP.HCM và Hà Nội.
12. **Hạn mức `/chat`:** giới hạn theo người dùng hay theo IP khi chưa có đăng nhập?
13. **Dự phòng khi server lỗi tạm thời:** frontend chuyển sang lưu trên máy khi route chưa có (404/405 trần), và cũng khi mất mạng, hết giờ hay 502-504 nếu backend chưa trả lời lần nào trong phiên. Khi đã có `/trips` thật, có nên bỏ hẳn dự phòng do lỗi tạm thời và chỉ giữ 404/405 trần?
