# Ước lượng thời gian tham quan ban đầu cho từng địa điểm của Journie

Tài liệu này đề xuất cách đặt thời gian ở lại ban đầu cho mỗi địa điểm khi chưa có dữ liệu đo riêng của Journie. Cách làm dựa trên các nghiên cứu đã kiểm chứng. Những số không có trong tài liệu được ghi rõ là ước lượng của nhóm.

> **Mức độ bằng chứng hiện có**
> - **Có số phút** (đo bằng dữ liệu vị trí hoặc do người trả lời tự khai) cho ba nhóm: nhà hàng [Kimes et al., 2002; Placer.ai, 2024], trung tâm thương mại [Ahmed et al., 2007; Placer.ai, 2026], và khoảng ước lượng của chuyên gia cho hai điểm lớn ở Paris [Popescu & Grefenstette, 2009]. Toàn bộ số liệu này đến từ Mỹ, Malaysia và châu Âu.
> - **Chưa có số phút** trong các nguồn đã kiểm chứng cho các loại sau: bảo tàng cỡ trung bình, chùa, đền, nhà thờ, công viên, chợ, quán cà phê, giải trí. Các mức cho những loại này là ước lượng của nhóm. Nghiên cứu chỉ cho biết yếu tố nào làm thời gian dài hơn hay ngắn hơn.
> - **Bài gốc** [Mahdi et al., 2023] cho khuôn mẫu mô hình (loại địa điểm, độ nổi tiếng, khả năng tiếp cận, ngày thường hay cuối tuần). Phần ghi chú đã đọc không có số phút theo từng loại, nên tài liệu này chỉ dùng bài như khuôn mẫu phương pháp.
> - **Ở Việt Nam** chưa tìm thấy nghiên cứu nào về thời gian ở lại tại từng điểm. Nguồn duy nhất về TP.HCM chỉ có số ngày lưu trú của cả chuyến đi [Hanoi Times, 2018].

---

## 1. Tóm tắt các nghiên cứu

### 1.1. Thời gian ở lại theo loại địa điểm

| Nguồn | Loại địa điểm | Dữ liệu | Con số chính | Dùng được gì cho Journie |
|---|---|---|---|---|
| [Mahdi et al., 2023] | Ăn uống, giải trí, tiện ích công cộng, mua sắm, điểm tham quan (Budapest) | Google Popular Times. Mẫu gồm 40% mua sắm, 22% ăn uống, khoảng 11% điểm tham quan. Có thêm các lớp GIS (an ninh, chỗ đỗ xe, giao thông công cộng). | Không ghi nhận số phút theo loại. Dùng hồi quy tuyến tính bền vững, kiểm định trên khoảng 15% dữ liệu giữ lại (RMSE, sai số tương đối). | Khuôn mẫu: thời gian = f(loại, số người đánh giá, điểm đánh giá, khả năng tiếp cận), tách ngày thường và cuối tuần. Đây là căn cứ để dùng trường thời gian của Google làm nhãn tạm. Hạn chế: nhãn là thời gian điển hình ở giờ cao điểm, không phải thời gian đo thật. |
| [Popescu & Grefenstette, 2009] | 53 điểm tham quan ở London, New York, Paris, San Francisco | Khoảng 930.000 ảnh Flickr, so với ước lượng của chuyên gia HomeAndAbroad | Chuyên gia ước lượng Louvre từ 30 phút đến 8 giờ, Notre-Dame Paris từ 30 phút đến 3 giờ. Ở phần lớn các điểm, trung bình tính từ Flickr nằm trong khoảng của chuyên gia. Ở điểm có mức tối thiểu cao, trung bình Flickr gần mức tối thiểu hơn. Mỗi lượt thăm được tính tối thiểu 10 phút. | Cách đo thời gian từ dấu thời gian ảnh, và lý do chọn mức mặc định thận trọng (gần mức thấp của chuyên gia). |
| [Chiou & Hsieh, 2020] | Các điểm tham quan ở huyện Yi-Lan (Đài Loan) | Dữ liệu điện thoại di động | Không có số phút. Mô hình AFT log-normal có frailty phù hợp nhất. Khách ở lâu hơn khi: là người trong huyện, đi vào kỳ nghỉ dài, đến công viên hoặc bảo tàng, đến vào buổi sáng, hoặc điểm nằm ở vị trí sau trong chuỗi tham quan. | Hỗ trợ giả định phân phối log-normal, và các biến buổi đến, thứ tự trong lịch trình. |
| [Martinez-Garcia et al., 2018] | Điểm di sản và toàn thành phố Girona | Theo dõi và khảo sát khách (phần tóm tắt không nêu cỡ mẫu) | Không có số trong phần tóm tắt | Danh sách biến điều chỉnh: đi cùng trẻ em, khoảng cách văn hoá, điểm đánh giá, giá vé, ràng buộc thời gian, khách trong ngày hay ở qua đêm, mùa. |
| [Yoshimura et al., 2016] | Bảo tàng Louvre (cánh Denon) | 81.498 thiết bị Bluetooth, tháng 4 đến tháng 8/2010, 8 điểm đo. Khoảng 8,2% khách bật Bluetooth. | Không ghi nhận số phút | Thời gian ở lại phụ thuộc giờ vào và mức đông đúc. Thời gian dừng ở từng phòng ngắn, nên thời gian của cả bảo tàng cần ước lượng riêng. |
| [East et al., 2017] | Một vườn thú | GPS kết hợp bảng hỏi, 931 nhóm khách | Không có số phút được xác nhận | Loại nhóm khách ảnh hưởng thời gian ở lại. Khách có xu hướng đi theo lối chính. |
| [Journal of Heritage Tourism, 2023] | Võng Sư Viên (Master-of-Nets Garden), Trung Quốc | Thị giác máy tính trên video | — | Chỗ càng đông, khách dừng càng ngắn (chỉ dùng cho hướng tác động). |

### 1.2. Ăn uống

| Nguồn | Loại địa điểm | Dữ liệu | Con số chính | Dùng được gì |
|---|---|---|---|---|
| [Kimes et al., 2002] | Bữa tối với bạn bè ở nhà hàng bình dân | Khảo sát 134 sinh viên Cornell (71,6% Bắc Mỹ, 18,7% châu Á, 8,2% châu Âu), phương pháp Time Sensitivity Measurement. Đây là số tự khai, không phải hành vi quan sát. | Trung bình kỳ vọng 60,2 phút. Theo nhóm: châu Á 57,2, Bắc Mỹ 59,0, châu Âu 77,3. Các ngưỡng: "ngắn" 29,9, "quá ngắn" 23,4, "dài" 81,6, "quá dài" 93,0. Điểm tối ưu 46, điểm bàng quan 48. Khoảng chấp nhận được khoảng 30 đến 90 phút. | Mức điển hình 60 phút, khoảng 30–90 phút. Số của khách châu Á hơi thấp hơn. |
| [Placer.ai, 2024] | Nhà hàng phục vụ bàn, nhà hàng ăn nhanh (Mỹ) | Dữ liệu vị trí di động | Nhà hàng phục vụ bàn: 52 phút (2019), 49 phút (12 tháng gần nhất). Nhà hàng ăn nhanh ngắn hơn nhưng không có số. | Mốc đo thực tế khoảng 50 phút, khớp với mức khoảng 60 phút tự khai. |
| [Bloom et al., 2012] | Chuỗi nhà hàng bình dân phục vụ bàn (Mỹ) | Quan sát ở nhiều chi nhánh (chỉ đọc được tóm tắt) | Không có hệ số | Bữa trưa hay bữa tối, và số người trong nhóm, là các yếu tố có ý nghĩa thống kê. |
| [Kimes & Robson, 2004] | Một nhà hàng 210 chỗ | Hơn 1.400 giao dịch POS | — | Định nghĩa thời gian ở lại là khoảng bàn bị chiếm, từ lúc mở đến lúc đóng hoá đơn. |
| [Thompson, 2009] | Mô phỏng | Hơn 1.200 kịch bản | Lợi ích doanh thu khi rút ngắn bữa ăn chưa bằng 1/4 mức mà giả định tỉ lệ thuận dự báo | Thời gian bữa ăn là một phân phối, không phải một con số cố định. |
| [Legg et al., 2019] | Thời gian quay vòng bàn | Dữ liệu mô phỏng | — | Dữ liệu thời gian lệch phải, nên dùng mô hình sống sót hoặc thang log và trung vị. |
| [Tombs & McColl-Kennedy, 2010] | 3 quán cà phê (Úc) | Quan sát và nhóm tập trung (chỉ đọc được tóm tắt) | — | Đi nhóm và đi gặp gỡ thì ngồi lâu hơn đi một mình. Đông người có thể làm thời gian dài ra hoặc ngắn đi. |
| [Moehring et al., 2020] | 198 nhà hàng | Khoảng 20.000 khung thời gian từ Google Popular Times | — | Tiền lệ dùng dữ liệu thời gian của Google. Bài chỉ kiểm tra tính hợp lý so với lý thuyết, không hiệu chuẩn với thời gian đo thật. |

### 1.3. Mua sắm

| Nguồn | Loại địa điểm | Dữ liệu | Con số chính | Dùng được gì |
|---|---|---|---|---|
| [Ahmed et al., 2007] | Trung tâm thương mại ở Malaysia | 132 sinh viên ở 5 trường tại Klang Valley, tự khai | Một lượt điển hình khoảng 2,5 giờ, ghé khoảng 6 cửa hàng. Hơn 1/3 đã đến từ 3 trung tâm trở lên trong 30 ngày trước. | Mốc trên cho trung tâm thương mại, chỉ đúng với nhóm khách trẻ. |
| [Placer.ai, 2026] | Trung tâm thương mại trong nhà, ngoài trời, outlet (Mỹ), mỗi loại 100 trung tâm | Dữ liệu vị trí di động | Tỉ lệ lượt thăm dài hơn 75 phút năm 2025: 37,6% (trong nhà), 33,4% (ngoài trời), 34,6% (outlet) | Hơn một nửa số lượt dưới 75 phút, tức trung vị dưới 75 phút. Không nên đặt mức điển hình 120 phút. |
| [Schwanen, 2004] | Mua sắm vào ngày làm việc (Hà Lan) | Khảo sát đi lại quốc gia năm 1998, người đi làm là chủ hộ. Nhóm chưa đọc toàn văn bài này. | — | Ràng buộc thời gian làm rút ngắn thời gian mua sắm. Đây là căn cứ cho hệ số nhịp độ. Cần đọc toàn văn trước khi trích dẫn chính thức. |

### 1.4. Cá nhân hoá và dự đoán thời gian ở lại

| Nguồn | Phạm vi | Dữ liệu | Con số chính | Dùng được gì |
|---|---|---|---|---|
| [Lim et al., 2015] (PersTour) | Điểm tham quan ở nhiều thành phố | Ảnh Flickr gắn vị trí | — | Thời gian thăm là khoảng từ ảnh đầu đến ảnh cuối tại một điểm. Thời gian cá nhân hoá bằng thời gian trung bình nhân với hệ số quan tâm theo thời gian (người đó ở lâu hơn hay ngắn hơn người trung bình với loại điểm này). |
| [Lim et al., 2018] | Bản mở rộng của PersTour | Ảnh Flickr ở các thành phố du lịch | Thời gian cá nhân hoá sát thực tế hơn cách dùng thời gian trung bình | Đường cơ sở "thời gian trung bình theo điểm", cập nhật có trọng số theo độ gần đây, và chỉ số RMSE giữa thời gian đề xuất và thời gian thực. |
| [Lim et al., 2019] | Tổng quan | — | — | Tài liệu tổng quan về cách các hệ lập lịch trình lấy thời gian thăm (trung bình từ ảnh, hoặc giá trị cố định). |
| [Ho & Lim, 2022] (POIBERT) | Lịch trình có giới hạn thời gian | Flickr: 5.654 người, 7 thành phố, khoảng 120 nghìn ảnh | Khoảng tin cậy 90% bằng bootstrapping | Ở điểm ít người đến, trung bình không đáng tin vì phương sai lớn và ít mẫu. Nên dùng khoảng tin cậy và co giãn thay cho trung bình thô. |
| [Scellato et al., 2011] (NextPlace) | Các nơi quen thuộc của từng người | 4 bộ dữ liệu vết di chuyển | Độ chính xác tới 90%, tốt hơn ít nhất 50% so với các phương pháp trước | Thời gian lưu lại dự đoán được từ lịch sử cá nhân. Hạn chế: chỉ áp dụng cho nơi quen thuộc, không phải lần đầu khách du lịch đến. |
| [Yang et al., 2018] | Thời điểm check-in | Dữ liệu check-in từ mạng xã hội vị trí | — | Cách mô hình hoá dữ liệu bị cắt (censored) theo kiểu phân tích sống sót. |
| [Xu et al., 2025] (TAPT) | Điểm kế tiếp và thời điểm đến | Foursquare Tokyo (2.293 người / 7.873 điểm / 447.570 check-in), Foursquare NYC (1.083 / 5.135 / 147.938), Gowalla California–Nevada (36.371 / 129.939 / 3.136.496) | — | Mô hình sâu dự đoán thời điểm đến, không dự đoán thời lượng. Dữ liệu check-in không có thời gian ở lại, nên chưa phù hợp với Journie ở giai đoạn đầu. |
| [Dedieu et al., 2018] | Thời lượng phiên nghe nhạc trực tuyến | Dữ liệu streaming (không thuộc du lịch) | — | Phương pháp: log thời lượng xấp xỉ phân phối chuẩn, co giãn phân cấp, hàm mất mát Huber cho giá trị ngoại lai, đánh giá bằng MAE. |
| [Yuan et al., 2018] | Quảng cáo trực tuyến | — | — | Empirical Bayes phân cấp cho dữ liệu thưa (tài liệu phương pháp bổ sung). |

### 1.5. Nguồn dữ liệu và bối cảnh

| Nguồn | Nội dung | Con số chính | Dùng được gì |
|---|---|---|---|
| [Google, 2025] | Cách Google tính "Mọi người thường dành" | — | Dữ liệu tổng hợp ẩn danh từ người dùng bật Lịch sử vị trí, chỉ hiển thị khi đủ lượt. Không công bố độ chính xác và có sai lệch do người dùng tự chọn bật. |
| [Foursquare, 2024] | Visits feed có trường `dwell` | Đơn vị là giây (thời điểm kết thúc trừ thời điểm bắt đầu) | Nguồn phân phối thời gian ở lại theo loại địa điểm, nếu xin được giấy phép học thuật. |
| [Yang et al., 2015] | Bộ check-in Foursquare mở | NYC 227.428 và Tokyo 573.703 check-in. Bộ toàn cầu: 33.278.683 check-in, 266.909 người, 3.680.126 địa điểm, 415 thành phố ở 77 nước. | Có nhãn loại và giờ, nhưng không có thời gian ở lại. |
| [Cheng et al., 2011] | Phân tích check-in quy mô lớn | 22 triệu check-in của 220.000 người | Khoảng cách giữa các lần check-in là dấu hiệu yếu cho thời gian ở lại. |
| [Hanoi Times, 2018] | Khảo sát khách đến TP.HCM năm 2017 | Khách quốc tế ở trung bình khoảng 5,21 ngày, chi khoảng 145 USD mỗi ngày | Chỉ cho bối cảnh độ dài chuyến đi, không có thời gian theo điểm. |

**Kết luận phần 1:** loại địa điểm là biến dự báo chính [Mahdi et al., 2023]. Thời gian ở lại lệch phải và nên mô hình hoá theo log [Chiou & Hsieh, 2020; Legg et al., 2019]. Mức mặc định nên thận trọng [Popescu & Grefenstette, 2009]. Thời gian riêng của từng điểm và từng người cần học dần từ dữ liệu [Lim et al., 2018; Ho & Lim, 2022].

---

## 2. Mô hình ước lượng đề xuất

### 2.1. Công thức tổng

Mô hình tính theo thang log. Mỗi yếu tố là một hệ số nhân, cách này phù hợp với giả định phân phối log-normal [Chiou & Hsieh, 2020; Dedieu et al., 2018].

```
Bước 1. Mức nền của địa điểm p (thuộc loại c):
  a) Nếu điểm có thời gian tham quan khuyến nghị chính thức O_p: B_p = O_p (bỏ qua b và c).
  b) Nếu không: B_p = B_c × m_quy_mô × m_hạng × m_kiểu_phục_vụ
  c) Nếu có giá trị Google G_p: log B_p ← (n_G·log G_p + κ·log B_p) / (n_G + κ)

Bước 2. Hệ số theo người đi:
  M = m_nhịp_độ × m_sở_thích × m_số_người × m_buổi × m_cuối_tuần
  M được chặn trong [0,6; 1,6]

Bước 3. d = chặn(B_p × M, [thấp_c, cao_c]), rồi làm tròn đến 5 phút.
  Nếu điểm có O_p hoặc G_p, khoảng chặn là [0,5·B_p; 2·B_p].

Bước 4. d ≤ giờ đóng cửa − giờ đến.
```

Tất cả các hằng số trong khối trên (0,6; 1,6; 0,5; 2; 5 phút; n_G, κ) là ước lượng của nhóm.

### 2.2. Mức nền theo loại (phút)

Mức điển hình được hiểu là trung vị của một điểm bình thường thuộc loại đó. Điểm lớn hoặc nổi tiếng được nâng lên bằng hệ số ở mục 2.3.

| Loại | Thấp | Điển hình | Cao | Căn cứ | Bằng chứng |
|---|---|---|---|---|---|
| food.restaurant | 30 | 60 | 90 | [Kimes et al., 2002]: "ngắn" 29,9, trung bình 60,2 (châu Á 57,2), "quá dài" 93,0. [Placer.ai, 2024]: đo được 49–52. | Số tự khai và số đo (Mỹ) |
| food.street_food | 15 | 30 | 45 | Ước lượng của nhóm. [Placer.ai, 2024] chỉ cho biết ăn nhanh ngắn hơn nhà hàng phục vụ bàn. | Không có số |
| food.food_court | 20 | 45 | 60 | Ước lượng của nhóm | Không có số |
| food.cafe | 20 | 45 | 90 | Ước lượng của nhóm. [Tombs & McColl-Kennedy, 2010] chỉ cho thông tin định tính. | Định tính |
| attraction.museum | 40 | 90 | 180 | Ước lượng của nhóm. [Popescu & Grefenstette, 2009]: khoảng chuyên gia rất rộng, trung bình đo từ ảnh nghiêng về mức thấp, nên chọn mức thận trọng. [Chiou & Hsieh, 2020]: bảo tàng thuộc nhóm ở lâu hơn. | Định tính |
| attraction.gallery | 30 | 60 | 90 | Ước lượng của nhóm. [Yoshimura et al., 2016]: dừng ở từng phòng ngắn. | Định tính |
| attraction.landmark | 15 | 45 | 90 | Ước lượng của nhóm. [Popescu & Grefenstette, 2009] | Định tính |
| attraction.historic_site | 20 | 45 | 120 | Ước lượng của nhóm. [Martinez-Garcia et al., 2018] (các biến điều chỉnh) | Định tính |
| attraction.viewpoint | 20 | 45 | 75 | Ước lượng của nhóm | Không có số |
| attraction.zoo | 60 | 120 | 240 | Ước lượng của nhóm. [East et al., 2017]: loại nhóm khách ảnh hưởng thời gian. | Định tính |
| attraction.theme_park | 120 | 180 | 360 | Ước lượng của nhóm | Không có số |
| culture_religion.church | 15 | 30 | 60 | Ước lượng của nhóm. [Popescu & Grefenstette, 2009]: mức tối thiểu của chuyên gia cho Notre-Dame Paris là 30 phút. | Định tính |
| culture_religion.pagoda | 20 | 40 | 75 | Ước lượng của nhóm | Không có số |
| culture_religion.temple | 20 | 40 | 75 | Ước lượng của nhóm | Không có số |
| culture_religion.shrine | 15 | 30 | 60 | Ước lượng của nhóm | Không có số |
| culture_religion.mosque | 15 | 30 | 60 | Ước lượng của nhóm | Không có số |
| nature.park | 20 | 45 | 120 | Ước lượng của nhóm. [Chiou & Hsieh, 2020]: công viên thuộc nhóm ở lâu hơn. Điểm lớn được nâng bằng hệ số diện tích. | Định tính |
| nature.garden | 20 | 45 | 90 | Ước lượng của nhóm. [Journal of Heritage Tourism, 2023] (ảnh hưởng của mức đông đúc) | Định tính |
| shopping.mall | 45 | 90 | 150 | [Placer.ai, 2026]: 33,4–37,6% lượt dài hơn 75 phút, tức trung vị ở Mỹ dưới 75 phút. [Ahmed et al., 2007]: khoảng 2,5 giờ (150 phút) làm mốc trên. Mức 90 là ước lượng của nhóm, nằm giữa hai nguồn. | Số đo và số tự khai |
| shopping.market | 30 | 60 | 120 | Ước lượng của nhóm. [Schwanen, 2004] (ảnh hưởng của ràng buộc thời gian) | Định tính |
| shopping.department_store | 30 | 60 | 90 | Ước lượng của nhóm | Không có số |
| entertainment.nightlife | 60 | 90 | 180 | Ước lượng của nhóm | Không có số |
| entertainment.karaoke | 60 | 120 | 180 | Ước lượng của nhóm | Không có số |
| entertainment.cinema | 120 | 150 | 180 | Ước lượng của nhóm. Nên lấy theo độ dài phim khi có. | Không có số |
| entertainment.performing_arts | 60 | 120 | 180 | Ước lượng của nhóm. Nên lấy theo độ dài suất diễn trên lịch chính thức. | Không có số |
| default | 20 | 40 | 90 | Ước lượng của nhóm | Không có số |

### 2.3. Điều chỉnh theo đặc điểm của địa điểm

Tất cả các hệ số ở đây là ước lượng của nhóm. Cột căn cứ chỉ cho biết nghiên cứu nào ủng hộ **hướng** tác động, không phải độ lớn.

| Yếu tố | Áp dụng cho | Quy tắc | Căn cứ về hướng tác động |
|---|---|---|---|
| **Quy mô** (diện tích tính từ polygon OSM) | nature.park | < 1 ha: ×0,7. 1–5 ha: ×1,0. 5–20 ha: ×1,4. > 20 ha: ×2,0. | [Mahdi et al., 2023] dùng biến GIS. [Chiou & Hsieh, 2020] |
| | nature.garden | < 1 ha: ×0,8. 1–5 ha: ×1,0. > 5 ha: ×1,3. | Như trên |
| | shopping.market | < 0,3 ha: ×0,75. 0,3–1 ha: ×1,0. > 1 ha: ×1,3. | Như trên |
| **Độ nổi tiếng** (hạng A–D) | attraction.\*, nature.\*, culture_religion.\* | A ×1,3. B ×1,15. C ×1,0. D ×0,85. | [Mahdi et al., 2023] và [Martinez-Garcia et al., 2018] dùng điểm đánh giá và số người đánh giá làm biến giải thích. Phần đã đọc không cho dấu và độ lớn của hệ số. |
| | food.\* | A ×1,1. Các hạng khác ×1,0. | Như trên |
| **Mức đông đúc** | Mọi loại | Không cộng thêm trong v1. Đây là lý do giữ hệ số hạng ở mức vừa phải. | Chỗ đông làm thời gian dừng ngắn đi [Yoshimura et al., 2016; Journal of Heritage Tourism, 2023], ngược hướng với độ nổi tiếng. |
| **Số người đánh giá trên Google** (757 điểm) | Mọi loại | Chưa đưa vào v1. Chỉ dùng để gán hạng tạm cho điểm thiếu hạng (ví dụ nhóm 10% cao nhất xếp như hạng B), và làm biến khi hiệu chỉnh ở giai đoạn 3. | [Mahdi et al., 2023] |
| **Kiểu phục vụ** | food.restaurant | Món nhanh (phở, bánh mì, cơm tấm, bún, hủ tiếu): ×0,6. Bình dân phục vụ bàn: ×1,0. Cao cấp (mức giá cao nhất trong thang): ×1,25. Lẩu, nướng, buffet: ×1,25. Michelin 1–3 sao: ×1,5. Bib Gourmand và Selected giữ ×1,0. | Khoảng 30–90 phút [Kimes et al., 2002]. Thời gian phụ thuộc đặc điểm bàn và nhóm khách [Kimes & Robson, 2004]. |
| **Giá vé** | attraction.\* | Không áp dụng trong v1. Đưa vào làm biến kiểm định ở giai đoạn 3. | [Martinez-Garcia et al., 2018] có biến điểm thu phí hay miễn phí, nhưng hướng tác động chưa xác minh. |
| **Thời gian chính thức** | Bảo tàng, điểm tham quan có công bố | Thay hẳn mức nền (bước 1a). Vẫn áp dụng hệ số theo người đi. | Mức chuyên gia rất rộng [Popescu & Grefenstette, 2009], nên số của chính điểm đó đáng tin hơn số chung của loại. |

### 2.4. Điều chỉnh theo người đi

Các hệ số ở đây cũng là ước lượng của nhóm, trừ khi ghi khác.

| Yếu tố | Quy tắc | Căn cứ về hướng tác động |
|---|---|---|
| **Nhịp độ** | Thư thả ×1,25, cân bằng ×1,0, dày đặc ×0,8. Với ăn uống: ×1,15 / ×1,0 / ×0,85, vì bữa ăn khó rút ngắn. Không áp dụng cho cinema và performing_arts (thời lượng cố định). | Ràng buộc thời gian làm ngắn thời gian ở lại [Schwanen, 2004; Martinez-Garcia et al., 2018]. |
| **Sở thích** (theo PersTour) | Trước khi có lịch sử: loại trùng sở thích đã chọn ×1,2, không quan tâm ×0,8, còn lại ×1,0. Sau khi có từ 3 lượt Live trở lên trong loại đó: thay bằng tỉ lệ cá nhân r = trung vị(thực tế / dự kiến), co về 1 theo công thức r̂ = (n·r + 3·1)/(n + 3), rồi chặn trong [0,6; 1,6]. | Hệ số quan tâm theo thời gian, nhân với thời gian trung bình của điểm [Lim et al., 2015], có cập nhật theo độ gần đây [Lim et al., 2018]. |
| **Số người** | Ăn uống và cà phê: 1 người ×0,85, 2 người ×1,0, 3–5 người ×1,1, từ 6 người trở lên ×1,25. Điểm tham quan: từ 6 người trở lên ×1,1. | Số người là yếu tố có ý nghĩa với thời gian bữa ăn [Bloom et al., 2012]. Nhóm ngồi cà phê lâu hơn người đi một mình [Tombs & McColl-Kennedy, 2010]. |
| **Đi cùng trẻ em** | zoo, theme_park, park: ×1,15 | Loại nhóm khách ảnh hưởng thời gian ở lại [East et al., 2017]. Trẻ em là một biến trong [Martinez-Garcia et al., 2018]. Hướng tác động chưa xác minh. |
| **Buổi trong ngày** | Điểm tham quan, nếu đến trước 11:00: ×1,1. Nhà hàng: bữa trưa ×0,85, bữa tối ×1,1. | Đến buổi sáng thì ở lâu hơn [Chiou & Hsieh, 2020]. Giờ vào ảnh hưởng thời gian ở lại [Yoshimura et al., 2016]. Bữa trưa và bữa tối khác nhau có ý nghĩa thống kê [Bloom et al., 2012]. |
| **Cuối tuần** | mall, market, park, cafe: ×1,1 | [Mahdi et al., 2023] ước lượng riêng ngày thường và cuối tuần. Độ lớn ×1,1 là ước lượng của nhóm. |
| **Kỳ nghỉ dài** (Tết, lễ) | ×1,0 trong v1, kiểm định sau | Kỳ nghỉ dài làm khách ở lâu hơn [Chiou & Hsieh, 2020], nhưng đông người lại làm ngắn đi [Journal of Heritage Tourism, 2023]. Hai tác động ngược nhau. |
| **Thứ tự trong ngày** | Không áp dụng trong v1, kiểm định ở giai đoạn 3 | Điểm nằm sau trong chuỗi có thời gian dài hơn [Chiou & Hsieh, 2020]. |

### 2.5. Co giãn khi dữ liệu thưa (shrinkage theo nhóm)

Khi một điểm có ít quan sát, trung bình riêng của điểm đó không đáng tin [Ho & Lim, 2022]. Vì vậy ước lượng cho từng điểm được kéo về mức của nhóm phía trên. Thứ bậc gồm: **điểm → loại (top.sub) → nhóm lớn (top) → default** [Dedieu et al., 2018; Yuan et al., 2018].

```
μ_p = (n_p · ȳ_p + κ · μ_cha) / (n_p + κ)

  ȳ_p    = trung bình log thời gian quan sát được tại điểm p
  μ_cha  = log của mức nền nhóm cha (đã nhân hệ số đặc điểm ở mục 2.3)
  n_p    = số lượt quan sát tại p
  κ      = số quan sát ảo của nhóm cha
```

- **Giá trị khởi đầu (ước lượng của nhóm):** κ = 5. Giá trị Google "Mọi người thường dành" được tính như n_G = 10 quan sát ảo, vì Google không công bố cỡ mẫu [Google, 2025]. Khi đó Google chiếm khoảng 2/3 trọng số so với mức nền theo loại. Nếu Google đưa ra một khoảng, lấy trung điểm hình học của khoảng đó.
- **Khi đủ dữ liệu:** ước lượng κ theo tỉ số giữa phương sai trong một điểm và phương sai giữa các điểm, theo cách empirical Bayes [Yuan et al., 2018]. Dùng hàm mất mát Huber để giảm ảnh hưởng của giá trị ngoại lai [Dedieu et al., 2018].
- **Giá trị hiển thị:** dùng trung vị, tức exp(μ_p), không dùng trung bình cộng, vì dữ liệu lệch phải [Legg et al., 2019].
- **Điểm có ít quan sát** (n_p < 10): tính khoảng tin cậy 90% bằng bootstrap [Ho & Lim, 2022]. Nếu khoảng quá rộng, giữ trọng số nghiêng về nhóm cha.

### 2.6. Thời lượng là một phân phối, không phải một con số

Thời gian ở lại dao động lớn quanh mức điển hình [Thompson, 2009]. Có thể coi [thấp, cao] xấp xỉ khoảng P10–P90 của phân phối log-normal. Khi đó độ phân tán của loại c được tính bằng σ_c ≈ ln(cao/thấp) / 2,56. Từ giai đoạn 2, bộ lập lịch có thể dùng σ_c để tính độ dự phòng cho cả ngày, thay vì cộng thêm vào từng điểm. Đây là đề xuất của nhóm.

---

## 3. Bảng giá trị đề xuất thay `visit_minutes.yaml`

Loader hiện tại (`load_visit_minutes` trong `app/services/routing/service.py`) chỉ đọc `version`, `default`, `categories`, và yêu cầu mọi giá trị là số nguyên dương. Vì vậy các khối `ranges`, `modifiers`, `shrinkage` dưới đây **bị bỏ qua an toàn** cho tới khi code đọc chúng. Có thể thay file ngay mà không phải sửa code.

```yaml
# Thời gian tham quan dự kiến theo loại địa điểm (taxonomy top.sub), đơn vị phút.
# `categories` là mức điển hình (trung vị) của một điểm bình thường thuộc loại đó.
# Loader hiện tại chỉ đọc version, default, categories. Các khối ranges, modifiers,
# shrinkage được giữ sẵn cho bước tính theo từng điểm và từng người đi.
version: visit-minutes-v1
default: 40
categories:
  food.restaurant: 60
  food.street_food: 30
  food.food_court: 45
  food.cafe: 45
  attraction.museum: 90
  attraction.gallery: 60
  attraction.landmark: 45
  attraction.historic_site: 45
  attraction.viewpoint: 45
  attraction.zoo: 120
  attraction.theme_park: 180
  culture_religion.church: 30
  culture_religion.pagoda: 40
  culture_religion.temple: 40
  culture_religion.shrine: 30
  culture_religion.mosque: 30
  nature.park: 45
  nature.garden: 45
  shopping.mall: 90
  shopping.market: 60
  shopping.department_store: 60
  entertainment.nightlife: 90
  entertainment.karaoke: 120
  entertainment.cinema: 150
  entertainment.performing_arts: 120

ranges:            # [thấp, cao], dùng để chặn sau khi nhân hệ số
  default: [20, 90]
  food.restaurant: [30, 90]
  food.street_food: [15, 45]
  food.food_court: [20, 60]
  food.cafe: [20, 90]
  attraction.museum: [40, 180]
  attraction.gallery: [30, 90]
  attraction.landmark: [15, 90]
  attraction.historic_site: [20, 120]
  attraction.viewpoint: [20, 75]
  attraction.zoo: [60, 240]
  attraction.theme_park: [120, 360]
  culture_religion.church: [15, 60]
  culture_religion.pagoda: [20, 75]
  culture_religion.temple: [20, 75]
  culture_religion.shrine: [15, 60]
  culture_religion.mosque: [15, 60]
  nature.park: [20, 120]
  nature.garden: [20, 90]
  shopping.mall: [45, 150]
  shopping.market: [30, 120]
  shopping.department_store: [30, 90]
  entertainment.nightlife: [60, 180]
  entertainment.karaoke: [60, 180]
  entertainment.cinema: [120, 180]
  entertainment.performing_arts: [60, 180]

fixed_length:      # không nhân theo nhịp độ hay sở thích; ưu tiên độ dài phim hoặc suất diễn nếu biết
  - entertainment.cinema
  - entertainment.performing_arts

modifiers:         # mọi hệ số là ước lượng ban đầu, sẽ hiệu chỉnh bằng dữ liệu Live
  person_multiplier_clip: [0.6, 1.6]
  round_to_minutes: 5
  anchored_range_factor: [0.5, 2.0]     # khoảng chặn khi có giờ chính thức hoặc giá trị Google
  pace:
    default: {relaxed: 1.25, balanced: 1.0, packed: 0.8}
    food: {relaxed: 1.15, balanced: 1.0, packed: 0.85}
  interest: {declared: 1.2, neutral: 1.0, not_interested: 0.8}
  personal_interest: {min_visits: 3, prior_count: 3, clip: [0.6, 1.6]}
  tier:
    default: {A: 1.3, B: 1.15, C: 1.0, D: 0.85}   # attraction, nature, culture_religion
    food: {A: 1.1, B: 1.0, C: 1.0, D: 1.0}
  restaurant_style:
    quick: 0.6
    casual: 1.0
    upscale: 1.25
    hotpot_bbq_buffet: 1.25
    michelin_star: 1.5
  party_size:
    food: {"1": 1.0, "2": 1.0, "3-5": 1.1, "6+": 1.25}
    food_solo: 0.85
    attraction_6_plus: 1.1
  with_children: {attraction.zoo: 1.15, attraction.theme_park: 1.15, nature.park: 1.15}
  time_of_day:
    attraction_before_11: 1.1
    meal: {lunch: 0.85, dinner: 1.1}
  weekend: {shopping.mall: 1.1, shopping.market: 1.1, nature.park: 1.1, food.cafe: 1.1}
  area_ha:         # max_ha: null nghĩa là không giới hạn trên
    nature.park:
      - {max_ha: 1, factor: 0.7}
      - {max_ha: 5, factor: 1.0}
      - {max_ha: 20, factor: 1.4}
      - {max_ha: null, factor: 2.0}
    nature.garden:
      - {max_ha: 1, factor: 0.8}
      - {max_ha: 5, factor: 1.0}
      - {max_ha: null, factor: 1.3}
    shopping.market:
      - {max_ha: 0.3, factor: 0.75}
      - {max_ha: 1, factor: 1.0}
      - {max_ha: null, factor: 1.3}

shrinkage:
  category_prior_count: 5    # κ
  google_prior_count: 10     # n_G
  min_obs_for_bootstrap_ci: 10
```

Ghi chú về `party_size.food`: hệ số cho nhóm 1 người nằm riêng ở `food_solo` (0,85). Khi viết code, nên gộp lại cho gọn bằng `{"1": 0.85, "2": 1.0, "3-5": 1.1, "6+": 1.25}`.

### 3.1. So sánh với các số đang dùng

Hiện có **ba bộ số khác nhau**:
- Backend: `visit-minutes-v0`.
- Frontend: bảng riêng trong frontend.
- journie-data: `configs/duration.v1.yaml` (`journie_category_prior_v1`, `confidence: 0.5`).

| Loại | Backend v0 | Frontend | journie-data | Đề xuất v1 | Lý do |
|---|---|---|---|---|---|
| food.restaurant | 60 | 75 | 75 | **60** | Trung bình tự khai 60,2 (khách châu Á 57,2) [Kimes et al., 2002]. Số đo 49–52 [Placer.ai, 2024]. Mức 75 gần ngưỡng "dài" 81,6. |
| food.cafe | 45 | 60 | 60 | **45** | Không có số phút. Giữ mức thấp và tăng bằng hệ số nhóm hoặc nhịp thư thả (nhóm 3–5 người đi thư thả: 45 × 1,1 × 1,15 ≈ 57, làm tròn 55). |
| food.street_food | (rơi vào default 40) | — | — | **30** | Loại mới trong taxonomy v1, ngắn hơn nhà hàng [Placer.ai, 2024]. |
| food.food_court | (40) | — | 60 | **45** | Loại mới, ước lượng của nhóm. |
| attraction.museum | 90 | 120 | 120 | **90** | Mức thận trọng [Popescu & Grefenstette, 2009]. Mức 120 tương đương một bảo tàng hạng A (90 × 1,3 = 117, làm tròn 115). Bảo tàng có giờ chính thức thì dùng giờ đó. |
| attraction.gallery | 60 | 90 | 90 | **60** | Thời gian dừng ở từng phòng ngắn [Yoshimura et al., 2016]. |
| attraction.landmark | 45 | 60 | 60 | **45** | Hạng A được 60 nhờ hệ số hạng. |
| attraction.historic_site | 45 | — | 75 | **45** | Hạng A được 60. Ưu tiên giờ chính thức. |
| attraction.viewpoint | (40) | — | 45 | **45** | Loại mới. |
| attraction.zoo | (40) | — | — | **120** | Loại mới. Default 40 quá thấp cho vườn thú (ước lượng của nhóm). |
| culture_religion.church | 30 | — | 45 | **30** | Mức tối thiểu của chuyên gia cho Notre-Dame Paris là 30 phút, và trung bình đo được nghiêng về mức tối thiểu [Popescu & Grefenstette, 2009]. |
| culture_religion.pagoda / temple | 40 | — | 45 | **40** | Không có bằng chứng để đổi. |
| culture_religion.mosque | (40) | — | — | **30** | Loại mới, xếp ngang nhà thờ và miếu. |
| nature.park | 45 | 90 | 90 | **45** | Công viên trên 20 ha sẽ được 90 nhờ hệ số diện tích. Công viên nhỏ trong nội đô không nên mặc định 90. |
| nature.garden | 45 | — | 75 | **45** | Điều chỉnh theo diện tích. |
| shopping.mall | 90 | 120 | 120 | **90** | Trung vị ở Mỹ dưới 75 [Placer.ai, 2026]. Mức 150 chỉ đúng cho sinh viên [Ahmed et al., 2007]. Người thích mua sắm được ×1,2, tức 108, làm tròn 110. |
| shopping.market | 60 | 90 | 90 | **60** | Chợ trên 1 ha được ×1,3, tức 78, làm tròn 80. |
| Các loại còn lại | giữ nguyên | — | — | **giữ nguyên** | Không có bằng chứng để đổi. |

**Tóm lại:**
1. Không đổi số nào của backend v0. Ở hai loại có số phút đo được (nhà hàng, trung tâm thương mại), bằng chứng ủng hộ số của backend hơn số của frontend.
2. Thêm 5 loại có trong taxonomy v1 nhưng đang rơi vào default 40: `street_food`, `food_court`, `viewpoint`, `zoo`, `mosque`. `entertainment.karaoke` có trong backend nhưng không có trong taxonomy v1. Vẫn giữ để file tương thích.
3. Số cao hơn ở frontend và journie-data gần với mức của **điểm nổi bật hoặc điểm lớn**. v1 đạt tới các mức này qua hệ số hạng và hệ số diện tích, thay vì áp cho cả loại.
4. Nên chỉ giữ một nguồn số duy nhất. Frontend nên hiển thị `visit_minutes` do API routing trả về thay vì dùng bảng riêng. `duration.v1.yaml` của journie-data nên được bỏ hoặc đồng bộ theo v1.

---

## 4. Kiểm chứng và hiệu chỉnh

### 4.1. Thu thập dữ liệu thật

| Nguồn | Cách làm | Lưu ý |
|---|---|---|
| **Chế độ Live** (nguồn chính) | Thời gian ở lại tính từ lúc vào đến lúc rời vùng geofence của điểm. Bán kính vùng lấy theo diện tích polygon. Có thêm nút "Đã rời đi" để người dùng xác nhận. Định nghĩa này tương đương khoảng quan sát đầu–cuối [Lim et al., 2015] và khoảng bàn bị chiếm [Kimes & Robson, 2004]. | Bỏ lượt ngắn hơn 10 phút (lượt đi ngang), theo ngưỡng tối thiểu của [Popescu & Grefenstette, 2009]. Phiên mất GPS hoặc app bị tắt giữa chừng được ghi là **bị cắt phải (right-censored)**, không bỏ đi [Yang et al., 2018; Chiou & Hsieh, 2020]. Người dùng phải đồng ý trước. Chỉ lưu (điểm, thời lượng, bối cảnh), không lưu toàn bộ vết di chuyển. |
| **Khảo sát nhanh trong app** | Sau mỗi điểm, hỏi một chạm: "ngắn hơn / vừa / dài hơn kế hoạch". Cuối ngày hỏi: "lịch có đủ thời gian không?" | Rẻ, dùng để kiểm tra hướng sai lệch theo loại. |
| **Khảo sát kiểu TSM** | Lặp lại thiết kế của [Kimes et al., 2002] cho nhà hàng và quán cà phê ở TP.HCM, với các mức "quá ngắn / ngắn / dài / quá dài". Cỡ mẫu tương đương bài gốc (khoảng 130 người). | Cho mốc tự khai của khách Việt, thay cho số của sinh viên Mỹ. |
| **Mẫu Google "Mọi người thường dành"** | Ghi thủ công theo mẫu phân tầng, khoảng 10 điểm mỗi loại, ưu tiên hạng A và B. Tuân thủ điều khoản của Google, không thu thập tự động. | Đây là nhãn tạm, không phải giá trị đúng [Google, 2025; Moehring et al., 2020]. Dùng để so sánh các bảng số trước khi có dữ liệu Live, giống cách [Mahdi et al., 2023] dùng làm biến mục tiêu. |
| **Giờ khuyến nghị chính thức** | Lấy từ website của bảo tàng và điểm tham quan, ghi vào dữ liệu điểm kèm nguồn. | Đưa vào ở bước 1a. |
| **Foursquare visits feed** | Xin quyền truy cập học thuật để có phân phối `dwell` theo loại [Foursquare, 2024]. | Không dùng khoảng cách giữa các check-in làm thời gian ở lại [Cheng et al., 2011; Yang et al., 2015]. |

### 4.2. Chỉ số đánh giá

- **MAE (phút):** trung bình |d̂ − d| theo từng loại, từng hạng và toàn bộ. Báo cáo thêm **RMSE** theo cách của [Lim et al., 2018]. MAE trên thang log (tương đương sai số tương đối) được dùng làm chỉ số phụ, theo [Dedieu et al., 2018].
- **Độ lệch có dấu:** trung bình (d̂ − d), để biết bảng số đang ước lượng thừa hay thiếu ở từng loại.
- **Độ phủ của khoảng:** tỉ lệ lượt thật nằm trong [thấp, cao]. Nếu coi khoảng là P10–P90 thì tỉ lệ kỳ vọng khoảng 80%.
- **Tỉ lệ ngày bị trễ:** số ngày Live có ít nhất một điểm bắt đầu muộn hơn kế hoạch quá 15 phút, hoặc phải bỏ điểm, chia cho tổng số ngày Live. Ngưỡng 15 phút là đề xuất của nhóm. Đo kèm **tỉ lệ ngày dư**: ngày có hơn 30 phút trống ngoài kế hoạch.
- **Quy tắc thay bảng:** chỉ chuyển sang bảng mới khi MAE giảm và tỉ lệ ngày trễ không tăng, so với hai đường cơ sở là v0 và bảng của frontend. Cách so sánh này giống cách các bài PersTour so với đường cơ sở dùng thời gian trung bình [Lim et al., 2018].

### 4.3. Lộ trình hiệu chỉnh và cá nhân hoá

| Giai đoạn | Điều kiện (ước lượng của nhóm) | Việc làm | Căn cứ |
|---|---|---|---|
| 0 | Hiện tại | Áp dụng v1: mức nền, khoảng, hệ số | Phần 2 |
| 1 | Trước khi có người dùng | Nhập giờ chính thức và mẫu Google. Tính MAE của v0, frontend và v1 trên mẫu Google để chọn bảng. | [Mahdi et al., 2023; Google, 2025] |
| 2 | Từ khoảng 30 lượt Live mỗi loại | Đặt lại B_c bằng trung vị quan sát. Bật shrinkage theo điểm và khoảng tin cậy bootstrap. | [Dedieu et al., 2018; Ho & Lim, 2022] |
| 3 | Vài nghìn lượt | Hồi quy bền vững trên log d theo các biến: loại, log(số người đánh giá), điểm đánh giá, diện tích, hạng, cuối tuần, buổi, số người, nhịp độ, giá vé, thứ tự trong ngày. Giữ lại khoảng 15% dữ liệu để kiểm định. Sau đó chuyển sang AFT log-normal có frailty theo điểm để xử lý dữ liệu bị cắt. | [Mahdi et al., 2023; Chiou & Hsieh, 2020; Legg et al., 2019] |
| 4 | Người dùng có từ 3 lượt trở lên trong một loại | Tính tỉ lệ sở thích theo thời gian của từng người, cập nhật theo độ gần đây. | [Lim et al., 2015; Lim et al., 2018] |
| 5 | Nhiều người dùng quay lại | Thử mô hình chuỗi để dự đoán thời gian lưu lại theo lịch sử cá nhân. Chỉ làm khi có dữ liệu thời lượng thật. | [Scellato et al., 2011; Yang et al., 2018; Xu et al., 2025] |

**Dòng nghiên cứu dự đoán thời gian ở lại (dùng cho phần tổng quan):**

| Năm | Nghiên cứu | Đóng góp | Journie lấy gì |
|---|---|---|---|
| 2009 | [Popescu & Grefenstette, 2009] | Đo thời gian thăm từ dấu thời gian ảnh, so với chuyên gia | Định nghĩa và mức mặc định thận trọng |
| 2011 | [Scellato et al., 2011] | Thời gian lưu lại dự đoán được từ chuỗi cá nhân | Lý do làm cá nhân hoá |
| 2015, 2018 | [Lim et al., 2015; Lim et al., 2018] | Thời gian theo điểm × hệ số quan tâm. Đánh giá bằng RMSE. | Công thức sở thích, chỉ số đánh giá |
| 2018 | [Yang et al., 2018] | Phân tích sống sót với dữ liệu bị cắt | Xử lý phiên Live dở dang |
| 2020 | [Chiou & Hsieh, 2020] | AFT log-normal có frailty cho điểm tham quan | Mô hình giai đoạn 3 |
| 2022 | [Ho & Lim, 2022] | Khoảng tin cậy bootstrap cho điểm ít mẫu | Xử lý điểm ít dữ liệu |
| 2023 | [Mahdi et al., 2023] | Hồi quy theo loại kèm độ nổi tiếng và khả năng tiếp cận, nhãn lấy từ Google | Khuôn mẫu mô hình nền |
| 2025 | [Xu et al., 2025] | Mô hình sâu dự đoán điểm kế tiếp và thời điểm đến | Hướng dài hạn, chưa áp dụng |

---

## 5. Tài liệu tham khảo

- Ahmed, Z. U., Ghingold, M., & Dahari, Z. (2007). Malaysian shopping mall behavior: an exploratory study. *Asia Pacific Journal of Marketing and Logistics*, 19(4), 331–348. Mẫu là 132 sinh viên ở Klang Valley.
- Bloom, B. A. N., Hummel, E. E., Aiello, T. H., & Li, X. (2012). The Impact of Meal Duration on a Corporate Casual Full-Service Restaurant Chain. *Journal of Foodservice Business Research*, 15(1), 19–38. https://doi.org/10.1080/15378020.2012.650591 (chỉ đọc được tóm tắt).
- Cheng, Z., Caverlee, J., Lee, K., & Sui, D. Z. (2011). Exploring Millions of Footprints in Location Sharing Services. *ICWSM 2011*. https://people.engr.tamu.edu/caverlee/pubs/cheng11icwsm.pdf
- Chiou, Y.-C., & Hsieh, C.-W. (2020). Determinants of tourists' length of stay at various tourist attractions based on cellular data. *Transportmetrica A: Transport Science*, 16(3), 716–733. https://doi.org/10.1080/23249935.2020.1722288
- Dedieu, A., Mazumder, R., Zhu, Z., & Vahabi, H. (2018). Hierarchical Modeling and Shrinkage for User Session Length Prediction in Media Streaming. arXiv:1803.01440. Chưa xác nhận được nơi công bố là CIKM 2018.
- East, D., Osborne, P., Kemp, S., & Woodfine, T. (2017). Combining GPS & survey data improves understanding of visitor behaviour. *Tourism Management*, 61, 307–320. https://doi.org/10.1016/j.tourman.2017.02.021
- Foursquare (2024). Research Visits Feed schema. https://docs.foursquare.com/data-products/docs/research-feed-schema (trang không ghi ngày, năm là ước lượng).
- Google (2025). About popular times, wait times & visit duration data. Google Business Profile Help. https://support.google.com/business/answer/6263531 (trang không ghi ngày).
- Hanoi Times (2018). Foreign tourists spend US$145 per day in Ho Chi Minh City. https://hanoitimes.vn/foreign-tourists-spend-us145-per-day-in-ho-chi-minh-city-4062.html
- Ho, N. L., & Lim, K. H. (2022). POIBERT: A Transformer-based Model for the Tour Recommendation Problem. *2022 IEEE International Conference on Big Data*. arXiv:2212.13900.
- Journal of Heritage Tourism (2023). Visitor crowding at World Heritage Sites based on tourist spatial-temporal distribution: a case study of the Master-of-Nets Garden, China. 18(5). https://doi.org/10.1080/1743873X.2023.2214680 (chưa xác định được tác giả).
- Kimes, S. E., & Robson, S. K. A. (2004). The Impact of Restaurant Table Characteristics on Meal Duration and Spending. *Cornell Hotel and Restaurant Administration Quarterly*, 45(4), 333–346. https://doi.org/10.1177/0010880404270063
- Kimes, S. E., Wirtz, J., & Noone, B. M. (2002). How long should dinner take? Measuring expected meal duration for restaurant revenue management. *Journal of Revenue and Pricing Management*, 1(3), 220–233.
- Legg, M., Tang, C. H. H., Hancer, M., & Slevitch, L. (2019). Using survival modeling for turn-time predictions in foodservice settings. *Journal of Foodservice Business Research*, 22(1), 20–36. https://doi.org/10.1080/15378020.2018.1534529 (bản trực tuyến ra năm 2018).
- Lim, K. H., Chan, J., Leckie, C., & Karunasekera, S. (2015). Personalized Tour Recommendation Based on User Interests and Points of Interest Visit Durations. *IJCAI 2015*, 1778–1783. https://ijcai.org/Abstract/15/253
- Lim, K. H., Chan, J., Leckie, C., & Karunasekera, S. (2018). Personalized trip recommendation for tourists based on user interests, points of interest visit durations and visit recency. *Knowledge and Information Systems*, 54(2), 375–406. https://doi.org/10.1007/s10115-017-1056-y
- Lim, K. H., Chan, J., Karunasekera, S., & Leckie, C. (2019). Tour recommendation and trip planning using location-based social media: a survey. *Knowledge and Information Systems*, 60(3), 1247–1275. https://doi.org/10.1007/s10115-018-1297-4
- Mahdi, A. J., Tettamanti, T., & Esztergár-Kiss, D. (2023). Modeling the Time Spent at Points of Interest Based on Google Popular Times. *IEEE Access*, 11, 88946–88959. https://doi.org/10.1109/ACCESS.2023.3305957
- Martinez-Garcia, E., Raya, J. M., & Galí, N. (2018). Factors Affecting Time Spent Visiting Heritage City Areas. *Sustainability*, 10(6), 1824 (chỉ đọc được tóm tắt).
- Moehring, M., Keller, B., Schmidt, R., & Dacko, S. G. (2020). Google popular times: towards a better understanding of tourist customer patronage behavior. *Tourism Review*, 76(3), 533–569. https://doi.org/10.1108/TR-10-2018-0152
- Placer.ai (2024). A data-driven look at consumer behavioral changes across food and essentials retail. https://www.placer.ai/anchor/articles/a-data-driven-look-at-consumer-behavioral-changes-across-food-and-essentials-retail (báo cáo của doanh nghiệp, không qua bình duyệt).
- Placer.ai (2026). How malls can win in 2026. https://www.placer.ai/anchor/reports/how-malls-can-win-in-2026 (báo cáo của doanh nghiệp. Chỉ dùng tỉ lệ lượt dài hơn 75 phút).
- Popescu, A., & Grefenstette, G. (2009). Deducing Trip Related Information from Flickr. *WWW 2009* (poster), Madrid. https://archives.iw3c2.org/www2009/proceedings/pdf/p1183.pdf
- Scellato, S., Musolesi, M., Mascolo, C., Latora, V., & Campbell, A. T. (2011). NextPlace: A Spatio-Temporal Prediction Framework for Pervasive Systems. *Pervasive 2011*, LNCS 6696, 152–169. https://doi.org/10.1007/978-3-642-21726-5_10
- Schwanen, T. (2004). The determinants of shopping duration on workdays in The Netherlands. *Journal of Transport Geography*, 12(1), 35–48. https://doi.org/10.1016/S0966-6923(03)00023-1 (chưa đọc toàn văn).
- Thompson, G. M. (2009). (Mythical) Revenue Benefits of Reducing Dining Duration in Restaurants. *Cornell Hospitality Quarterly*, 50(1), 96–112. https://doi.org/10.1177/1938965508328422
- Tombs, A., & McColl-Kennedy, J. R. (2010). Social and spatial influence of customers on other customers in the social-servicescape. *Australasian Marketing Journal*, 18(3), 120–131. https://doi.org/10.1016/j.ausmj.2010.04.001 (chỉ đọc được tóm tắt).
- Xu, Y., Shen, H., Jiang, Y., & Wang, E. (2025). Where and When: Predict Next POI and Its Explicit Timestamp in Sequential Recommendation. *IJCAI 2025*, 3507–3515. https://www.ijcai.org/proceedings/2025/390
- Yang, D., Zhang, D., Zheng, V. W., & Yu, Z. (2015). Modeling User Activity Preference by Leveraging User Spatial Temporal Characteristics in LBSNs. *IEEE Transactions on Systems, Man, and Cybernetics: Systems*, 45(1), 129–142. Bộ dữ liệu: https://sites.google.com/site/yangdingqi/home/foursquare-dataset
- Yang, G., Cai, Y., & Reddy, C. K. (2018). Spatio-Temporal Check-in Time Prediction with Recurrent Neural Network based Survival Analysis. *IJCAI 2018*, 2976–2983. https://www.ijcai.org/proceedings/2018/413
- Yoshimura, Y., Krebs, A., & Ratti, C. (2016). An analysis of visitors' length of stay through noninvasive Bluetooth monitoring in the Louvre Museum. arXiv:1605.00108. Cũng đăng trên *IEEE Pervasive Computing*, 16(2), 26–34 (2017).
- Yuan, Y., Dong, X., Dong, C., Sun, Y., Yan, Z., & Pani, A. (2018). Dynamic Hierarchical Empirical Bayes: A Predictive Model Applied to Online Advertising. arXiv:1809.02213 (AdKDD 2018).
