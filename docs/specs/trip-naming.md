# Spec: Cách đặt tên chuyến đi tự động (bản 2)

Trạng thái: **bản nháp, chờ duyệt.** Chưa sửa code.
Ngày: 2026-11-24

Bản 1 ghép công thức "thành phố + chủ đề + số ngày", ví dụ "Sài Gòn ăn khắp · 2 ngày". Bạn nhận xét bản đó máy móc và nghe như AI viết, nên bản này đổi hướng: tên ngắn, có hình ảnh, gắn với nơi chuyến đi thật sự ghé, và do người viết sẵn chứ không do mô hình sinh ra lúc chạy.

## 1. Những gì tìm được

- **Tên không cần chứa hết thông tin.** Thời lượng và giờ đi có thể để ở phần mô tả ([Xola](https://www.xola.com/articles/how-to-choose-a-catchy-name-for-your-new-tour)). Thẻ của Journie đã hiện ngày đi, nên bỏ "· 2 ngày" khỏi tên.
- **Tên hay gói ba ý: nơi chốn, nhịp đi và trải nghiệm hứa hẹn.** Hãy đặt tên theo cảm giác chuyến đi mang lại: nghỉ ngơi, ăn uống, tò mò… Một phép thử tốt: chỉ đọc tên có đoán được không khí chuyến đi không, và điểm nào xứng đáng làm ảnh bìa ([The Story Shack](https://thestoryshack.com/tools/travel-itinerary-name-generator/)). Các tên mẫu đều ngắn, có hình ảnh và bám một điểm nhấn, như "Lisbon Blue Hour".
- **Tên theo chủ đề của chuyến đi, và với chuyến ngắn thì dùng cách nói tự nhiên** như "A weekend in Paris" hay "24 hours in Brighton" ([Photobox](https://www.photobox.co.uk/blog/occasions/travel/60-travel-photo-book-title-ideas)).
- **Tên tạo tự động chỉ từ địa điểm và ngày tháng thường nhạt.** Ví dụ, người dùng và người viết review nhận xét tên ký ức do Apple Photos tự tạo khá nhàm, và tên này thay đổi theo vị trí chụp ảnh ([The Sweet Setup](https://thesweetsetup.com/edit-titles-icloud-photos-memories/), [Apple Community](https://discussions.apple.com/thread/255051188)). Đây là kiểu tên bản 1 đang mắc phải.
- **Tên tour tiếng Việt hay** thường dùng biệt danh và hình ảnh quen thuộc của thành phố, như "Hà Nội 36 phố phường", "Huế mộng mơ", "Sài Gòn không ngủ". Phần này là quan sát chung, không có nguồn trích dẫn: lượt tìm không ra bài hướng dẫn tiếng Việt nào đáng tin.

## 2. Nguyên tắc

1. **Ngắn và có hình ảnh:** khoảng 2 đến 6 chữ, đọc lên nghe như người đặt.
2. **Đúng sự thật.** Chỉ nhắc khu hay điểm mà lịch thật sự ghé. Ví dụ, tên chỉ có "Hồ Tây" khi lịch có điểm ở Tây Hồ.
3. **Do người viết sẵn.** Dùng một kho câu tiếng Việt và tiếng Anh, có người duyệt, không để LLM tự sinh lúc chạy. Như vậy giọng văn đồng đều, không có kiểu câu "AI".
4. **Giữ số ngày ở cuối** (bạn đã chọn): `{câu} · {N} ngày`, ví dụ "Sài Gòn lên đèn · 2 ngày". Vì vậy kho câu không chứa từ chỉ thời lượng như "48 giờ" hay "một ngày", để không lặp ý.
5. **Cố định từ lúc tạo** (bạn đã chọn): tên được chọn một lần khi tạo chuyến và lưu lại. Chỉnh lịch sau đó không làm đổi tên. Riêng phần thêm vào để tránh trùng vẫn được tính lúc hiển thị.
6. **Không trùng** trong danh sách của một người. Nếu trùng, đổi sang câu khác cùng chủ đề trước, rồi mới thêm thời điểm.

## 3. Cách chọn tên

1. **Chủ đề** được tính từ các điểm trong lịch, giống bản 1: ăn uống, về đêm, cà phê, lịch sử hoặc di sản, chợ, xanh, ngày mưa, hoặc pha trộn.
2. **Bối cảnh** cũng lấy từ lịch:
   - khu có nhiều điểm nhất, ví dụ Chợ Lớn, Phố cổ, Tây Hồ, Thảo Điền;
   - mùa theo tháng đi và theo thành phố, ví dụ thu Hà Nội tháng 9 đến 11, mùa mưa Huế tháng 9 đến 12;
   - kiểu thời gian: cuối tuần, đi trong ngày, 48 giờ.
3. **Chọn câu** trong kho theo thành phố, chủ đề và bối cảnh. Câu nào cần khu hay mùa thì chỉ dùng khi lịch có đúng khu hay mùa đó. Câu được chọn cố định theo id của chuyến, nên tải lại trang không đổi tên.
4. **Tránh trùng:** nếu trùng với chuyến khác, lấy câu kế tiếp cùng chủ đề. Nếu hết câu thì thêm thời điểm trong ngoặc: "(tháng 12)", rồi "(5/12)", và bước cuối "(5/12, lần 2)". Không dùng "#2". Dùng ngoặc vì nhiều câu đã có dấu phẩy, ví dụ "Hà Nội, cụng ly! (5/12) · 2 ngày".
5. **Bản sao:** giữ tên gốc và thêm ngày đi mới, ví dụ "Sài Gòn lên đèn · 2 ngày (13/12)".

**Đã làm (2026-11-24):** kho câu ở `src/content/tripNames.ts`; logic chọn tên ở `src/domain/tripText.ts` (`nameTrip`, `nameIdeas`, `tripTitle` với danh sách chuyến); tên được chọn lúc tạo trong `src/domain/planner.ts` và `useCreateTrip`; chip gợi ý và cảnh báo trùng trong sheet "Chuyến trống".
- **Thử 40 người, mỗi người 5 chuyến, dữ liệu thật của 4 thành phố:** không có tên trùng. 15% chuyến phải thêm thời điểm, vượt mục tiêu 10%, vì chủ đề "về đêm" ở Huế và Đà Nẵng chỉ có 1–2 câu.
- **Chuyến tạo trước khi có kho câu:** được gán một câu chung của thành phố, cố định theo id của chuyến.

## 4. Kho câu (bản 2, cần bạn duyệt)

Bản 1 khớp ý nhưng nghe chưa hay vì câu kể lể ("ăn từ sáng tới khuya") hoặc khô ("ăn khắp"). Bản 2 viết theo bốn mẹo:
- **dùng tiếng lóng địa phương:** "ăn quà" của Hà Nội, "lê la", "ăn sập";
- **dùng hình ảnh giác quan:** gió heo may, mưa dầm, ly sữa đá;
- **ngắt nhịp bằng dấu phẩy** như cách người Việt nói;
- **dùng biệt danh thành phố:** Thăng Long, Cố đô, Hòn ngọc Viễn Đông.

Chữ in nghiêng trong ngoặc là điều kiện để dùng câu đó.

**Sài Gòn**

| Chủ đề | Tiếng Việt | English |
|---|---|---|
| ăn uống | Ăn sập Sài Gòn · Lê la vỉa hè Sài Gòn · Sài Gòn, ăn tới bến · Chợ Lớn no say *(ghé Quận 5)* | Eat your way through Saigon · Saigon sidewalk feasts · Cholon, plate by plate *(District 5)* |
| về đêm | Sài Gòn lên đèn · Sài Gòn không ngủ · Sài Gòn, cụng ly! *(có bar hoặc pub)* | Saigon lights up · Saigon never sleeps · Cheers, Saigon! *(bar or pub)* |
| cà phê | Sài Gòn, một ly sữa đá · Cà phê bệt, phố cũ · Chậm lại cùng cà phê Sài Gòn | Saigon, one iced coffee at a time · Slow coffee, old streets |
| lịch sử | Sài Gòn, những lớp thời gian · Ký ức Hòn ngọc Viễn Đông | Saigon, layers of time · Pearl of the Orient, remembered |
| chợ | Lạc giữa chợ Sài Gòn · Sài Gòn chợ búa | Lost in Saigon's markets |
| mưa | Sài Gòn mưa rồi tạnh · Trốn mưa Sài Gòn *(dự báo mưa)* | Saigon, rain and shine *(rain forecast)* |
| pha trộn | Sài Gòn đủ vị · Chào Sài Gòn · Sài Gòn cuối tuần *(đi Thứ 7 hoặc Chủ nhật)* | Saigon, all the flavours · Hello, Saigon · A Saigon weekend *(Sat or Sun)* |

**Hà Nội**

| Chủ đề | Tiếng Việt | English |
|---|---|---|
| phố cổ | Lạc giữa băm sáu phố phường · Một vòng phố cổ · Đêm phố cổ *(có điểm tối)* | Lost in the 36 streets · Around the Old Quarter |
| ăn uống | Hà Nội ăn quà · Ăn quà phố cổ *(ghé Hoàn Kiếm)* · Hà Nội, bát phở sớm *(có quán phở)* | Hanoi street snacks · Hanoi, an early bowl of pho *(pho shop)* |
| mùa | Gió heo may Hà Nội *(tháng 9 đến 10)* · Hà Nội mùa hoa sữa *(tháng 10 đến 11)* · Hà Nội se lạnh *(tháng 12 đến 2)* · Hà Nội mưa phùn *(tháng 2 đến 3)* | Hanoi in autumn · Hanoi, milk flower season · Crisp Hanoi days · Hanoi drizzle |
| lịch sử | Thăng Long nghìn năm · Dấu xưa Thăng Long | A thousand years of Thang Long |
| cà phê | Cà phê vỉa hè Hà Nội · Hà Nội, ngồi một chút | Sidewalk coffee, Hanoi |
| về đêm | Hà Nội về khuya · Hà Nội, cụng ly! *(có bar hoặc bia hơi)* | Hanoi after hours · Cheers, Hanoi! |
| Tây Hồ | Chiều Hồ Tây · Hồ Tây lộng gió *(ghé Tây Hồ)* | West Lake afternoons |

**Huế**

| Chủ đề | Tiếng Việt | English |
|---|---|---|
| di sản | Nghe Huế kể chuyện xưa · Chạm vào Cố đô · Huế trầm mặc | Hue, old stories · Touching the old capital |
| chậm | Huế thong thả · Huế chậm | Slow Hue · Unhurried Hue |
| mưa | Huế mưa dầm · Trú mưa xứ Huế *(dự báo mưa hoặc tháng 9 đến 12)* | Hue in the rain |
| ăn uống | Ăn Huế cho cay · Xứ Huế, vị cay | Hue, the spicy way |
| cà phê | Huế, cà phê và chậm | Coffee and slow days in Hue |
| về đêm | Huế về đêm | Hue after dark |

**Đà Nẵng**

| Chủ đề | Tiếng Việt | English |
|---|---|---|
| về đêm | Đà Nẵng lên đèn · Đà Nẵng, cụng ly! *(có bar hoặc pub)* | Da Nang lights up · Cheers, Da Nang! |
| ăn uống | Đà Nẵng no say · Đà Nẵng, tô mì Quảng *(có quán mì Quảng)* · Đà Nẵng, vị biển *(có quán hải sản)* | Da Nang, well fed · Da Nang, a bowl of mi Quang · Da Nang seafood days |
| cà phê | Đà Nẵng thong thả | Easy days in Da Nang |
| pha trộn | Chào Đà Nẵng · Đà Nẵng đáng sống · Đà Nẵng cuối tuần *(đi Thứ 7 hoặc Chủ nhật)* | Hello, Da Nang · Da Nang, the liveable city · A Da Nang weekend |

Quy tắc chung:
- Mỗi thành phố và mỗi chủ đề có 2 đến 4 câu.
- Không nhắc địa danh chưa có trong dữ liệu, ví dụ Cầu Rồng, biển Mỹ Khê, Đại Nội.
- Không trích lời bài hát.
- Câu có dấu chấm than chỉ dùng cho chủ đề về đêm.

## 5. Gợi ý tên khi tạo chuyến

Khi tạo chuyến hoặc đổi tên, hiện 3 gợi ý lấy từ kho để bạn bấm chọn, như "Sài Gòn lên đèn", "Sài Gòn không ngủ", "Sài Gòn cuối tuần". Người dùng vẫn tự gõ được. Nếu tên gõ vào đã có, app gợi ý một câu khác nhưng không chặn việc lưu.

## 6. Cách làm khi được duyệt

- **Code:**
  - Kho câu đặt ở `src/content/tripNames.ts`. Bạn có thể tự sửa câu trong file này.
  - Logic chọn câu đặt ở `src/domain/tripText.ts`.
  - Gắn chip gợi ý vào `CreateTripSheets.tsx` và chỗ đổi tên chuyến.
  - Không đổi dữ liệu đã lưu, không đổi kiến trúc, không thêm thư viện.
- **Kiểm tra:**
  - Tạo tên cho 96 chuyến thử ở 4 thành phố.
  - Không có tên nào nhắc khu hay mùa không đúng với lịch.
  - Không có tên trùng trong danh sách của cùng một người.
  - Dưới 10% chuyến phải dùng tới bước thêm thời điểm.
- **Phân công:** một người làm code, một người đọc độc lập duyệt từng câu trong kho xem có tự nhiên không. Bạn duyệt kho câu lần cuối.

## 7. Quyết định

- Giữ số ngày: **có**, theo dạng `{câu} · {N} ngày`.
- Tên cố định từ lúc tạo: **có**.
- Kho câu: bản 1 đúng ý nhưng chưa hay. Bản 2 ở mục 4 đang chờ bạn duyệt. Bạn đánh dấu câu nào thích hoặc không thích, mình sẽ sửa tiếp trước khi làm.
