# Xếp hạng gap nghiên cứu: lịch trình du lịch thành phố

**Tóm tắt.** Nên làm **G01** (sửa lịch trình giữa chuyến sau một sự cố, thay đổi ít nhất). Dự phòng là **G05** (xác suất mở cửa của POI từ các nguồn dữ liệu mâu thuẫn).

**Cảnh báo.** Bước kiểm phản chứng không chạy được cho cả 17 gap, nên chưa gap nào được xác nhận là còn mở. Thứ hạng chỉ dựa trên độ dày bằng chứng, độ khớp với dữ liệu đang có và khả năng làm xong trong 8-12 tuần. Việc đầu tiên là chạy lại các truy vấn phản chứng cho G01 và G05.

## 1. Phương pháp rà soát và giới hạn

**Kho tài liệu: 35 nguồn.**
- 8 survey/review: 7 về du lịch, gợi ý POI và bài toán orienteering, 1 về giao hàng.
- 3 benchmark lập kế hoạch du lịch bằng LLM và 1 bài nêu quan điểm.
- 16 bài nghiên cứu (phương pháp, hệ thống, kiểm định dữ liệu).
- 7 ghi chú cũ chưa kiểm chứng (5 bài báo, 2 trang web).

Tám survey/review:
- "Tour recommendation and trip planning using location-based social media: a survey" (Lim et al., 2019): đọc toàn văn.
- "Point of Interest Recommendation: Pitfalls and Viable Solutions" (Bellogin et al., 2025): chỉ đọc bản tóm tắt.
- "A systematic literature review for the tourist trip design problem" (Ruiz-Meza and Montoya-Torres, ORP 2022): đọc toàn văn.
- "A survey of the orienteering problem: model evolution, algorithmic advances, and future directions" (arXiv 2512.16865): chỉ đọc bản tóm tắt.
- "A survey on personalized itinerary recommendation: From optimisation to deep learning" (Halder et al., 2024): đọc toàn văn.
- "A Survey on Point-of-Interest Recommendations Leveraging Heterogeneous Data" (Wang, Hopken, Jannach, 2023): chỉ đọc bản tóm tắt.
- "A review on individual and multistakeholder fairness in tourism recommender systems" (Banerjee et al., 2023): chỉ đọc bản tóm tắt.
- "A Survey on Service Route and Time Prediction in Instant Delivery" (Wen et al., 2023): đã đối chiếu toàn văn ở vòng trước; lĩnh vực giao hàng.

**Mức độ đọc.** 9 nguồn đọc toàn văn; 8 nguồn đã đối chiếu toàn văn ở vòng trước; 1 nguồn chỉ đối chiếu abstract; 10 nguồn chỉ đọc qua bản tóm tắt lấy về; 7 nguồn là ghi chú chưa kiểm.

**Cách gom.**
- Chỉ lấy ba loại phát biểu: hạn chế hoặc hướng mở do chính tác giả nêu; kết quả đo của benchmark; phạm vi của bài (bài đó không xét gì).
- Gom theo chủ đề thành 17 gap. Mỗi gap phải viết lại được thành một bài toán nhỏ có đầu vào, quyết định, mục tiêu.
- Độ mạnh đếm theo số nguồn và số nhóm tác giả độc lập. Nhận xét của người đọc mà tác giả không nêu thì không tính.

**Cách kiểm phản chứng.** Mỗi gap có 4-5 truy vấn để tìm bài đã giải nó, rồi gán trạng thái mở, một phần hoặc đã giải, kèm bài gần nhất và phần còn lại. Vòng này bước tìm kiếm thất bại ở cả 17 gap: công cụ tìm kiếm báo hết hạn mức sử dụng (hẹn mở lại 6:10 sáng giờ Việt Nam) và Semantic Scholar trả lỗi 429. Hệ quả:
- 12 nhãn "mở" là nhãn mặc định, không phải kết luận.
- 5 nhãn "một phần" (G03, G09, G10, G11, G12) là ước đoán theo trí nhớ.
- Chỉ G10 và G11 có bài gần nhất (4 bài), đều nhớ lại, chưa mở lại bài; đường dẫn chưa xác nhận, một cái chỉ là truy vấn Scholar.

**Giới hạn.**
1. Không có kiểm phản chứng nên không khẳng định được gap nào còn mở.
2. Bằng chứng tập trung vào ít nguồn: Bellogin et al. (2025) đứng sau 12/17 gap nhưng chỉ đọc qua tóm tắt. Survey orienteering (arXiv 2512.16865) và TRIP-PAL mỗi bài đứng sau 7 gap, cũng qua tóm tắt.
3. Nhiều nguồn du lịch đến từ cùng một nhóm (các bài có Lim), nên số nguồn lớn hơn số nhóm độc lập.
4. "Tác giả nói là hướng mở" không có nghĩa đến nay chưa ai làm: nhiều phát biểu có từ 2012-2019.
5. Kho mỏng nhất ở mảng vận trù học về orienteering động và ngẫu nhiên, đúng nơi dễ có bài đã giải G01, G03, G07, G08.

## 2. Bảng tất cả các gap

Chú thích:
- (a) Nhãn mặc định vì không tìm kiếm được; không phải kết luận.
- (b) Ước đoán theo trí nhớ, chưa đối chiếu bài nào.
- Không gap nào mang nhãn "đã giải", nhưng chỉ vì chưa tìm.
- Cột "Bài gần nhất": trừ G10 và G11, tên ghi ở đây là bài gần nhất trong chính kho đã đọc, vì chưa tìm được bài ngoài kho.

| Hạng | Gap | Nguồn ủng hộ | Trạng thái | Bài gần nhất | Phần còn mở |
|---|---|---|---|---|---|
| 1 | G01 Sửa lịch trình giữa chuyến sau một sự cố | 7 (4 survey, 3 hệ thống/benchmark; 7 nhóm) | Mở (a) | "TripTide: A Benchmark for Adaptive Travel Planning under Disruptions" | Sửa giữa chuyến có phạt cho mỗi thay đổi, khung giờ cứng, trả lời khoảng 1 giây |
| 2 | G02 Kiểm tra và sửa lịch trình do LLM viết bằng dữ liệu thời gian thật | 8 (6 bài lập kế hoạch bằng LLM, 1 survey, 1 bài quan điểm) | Mở (a) | "ATLAS: Constraints-Aware Multi-Agent Collaboration for Real-World Travel Planning" (có bộ kiểm tra, chưa có bộ giải hình thức) | Tỉ lệ kế hoạch LLM sai giờ ở một thành phố thật; sửa bằng ít phép sửa nhất |
| 3 | G05 Dữ liệu tồn tại và giờ mở cửa của POI cũ, mâu thuẫn | 6 (4 nguồn độc lập do tác giả nêu; 1 chưa kiểm) | Mở (a) | "Point-of-Interest (POI) Data Validation Methods: An Urban Case Study" (không đánh giá giờ mở cửa) | Xác suất mở theo POI, thứ, giờ, đã hiệu chỉnh, chấm trên mẫu kiểm tay |
| 4 | G04 Thời lượng tham quan cho POI ít khách và theo ngữ cảnh | 8 (3 nhóm độc lập; 1 chưa kiểm) | Mở (a) | "POIBERT: A Transformer-based Model for the Tour Recommendation Problem" | Khoảng 80% cho POI không có mẫu, theo thứ và giờ đến |
| 5 | G06 Khách mới chưa có lịch sử: học sở thích bằng vài câu hỏi | 7 (3 survey, 4 hệ thống; 5 nhóm) | Mở (a) | "Personalized and situation-aware multimodal route recommendations: the FAVOUR algorithm" (bài toán chọn tuyến) | Regret theo số câu hỏi k; từ câu trả lời ra thẳng lịch trình |
| 6 | G10 Giải thích quyết định của lịch trình | 5 (5 nhóm; phần lớn là lời kêu gọi chung) | Một phần (b) | "Contrastive Explanations of Plans Through Model Restrictions" (JAIR 2021) và 2 bài khác; đều nhớ lại, chưa kiểm | Lời giải thích nhỏ nhất, kiểm được bằng giải lại, cho câu hỏi "vì sao không có POI X" |
| 7 | G09 Giá trị POI phụ thuộc giờ trong ngày và thời tiết | 5 (4 nhóm) | Một phần (b) | Chưa có | Đường giá trị theo giờ và thời tiết học từ dữ liệu; kiểm với nhãn "giờ đẹp nhất" |
| 8 | G14 Thiên lệch về điểm nổi tiếng và mức hiển thị của POI | 4 (đều ở mức survey/review) | Mở (a) | Chưa có | Trần độ tập trung hiển thị khi sinh lịch trình và cái giá về lợi ích |
| 9 | G13 Tối ưu hình thức không phải lịch trình người ta thích | 5 (4 nhóm; 1 chưa kiểm) | Mở (a) | "TripTailor: A Real-World Benchmark for Personalized Travel Planning" (kho lịch trình thật, chỉ Trung Quốc) | Học hàm chấm điểm từ lịch trình thật rồi dùng trong bộ tối ưu |
| 10 | G11 Đánh giá lịch trình không cần lịch trình mẫu | 7 (5 survey/review, 2 benchmark) | Một phần (b) | "TravelPlanner: A Benchmark for Real-World Planning with Language Agents" (kiểm theo luật; nhớ lại, chưa kiểm lại) | Thước đo khớp với lựa chọn từng cặp của người |
| 11 | G03 Lập lịch với xác suất đúng giờ công bố trước | 7 (2 chưa kiểm; 1 khác lĩnh vực) | Một phần (b) | "Solving the stochastic time-dependent orienteering problem with time windows" (ghi chú chưa kiểm) | Giờ mở cửa cũng bất định; ràng buộc xác suất chung từ 90% |
| 12 | G08 Chuyến nhiều ngày: xếp POI vào ngày | 6 (1 khác lĩnh vực) | Mở (a) | "TRIP-PAL: Travel Planning with Guarantees by Combining LLMs and Automated Planners" (chỉ một ngày) | Phần lợi ích mất khi chia ngày trước rồi mới xếp tuyến, so với giải chung |
| 13 | G12 Lịch trình tính đến đám đông và sức chứa cho nhiều khách | 6 (4 nhóm) | Một phần (b) | "Strategic and Crowd-Aware Itinerary Recommendation" (mô phỏng công viên giải trí) | Phân lịch cho khách đến dần ở thành phố mở, POI có sức chứa theo giờ |
| 14 | G07 Thời gian đi thật và nhiều phương tiện trong bộ lập lịch | 8 (5 nguồn du lịch từ 3 nhóm; 1 khác lĩnh vực) | Mở (a) | Chưa có | Chọn phương tiện từng chặng theo giờ đi và giá, dưới hai ngân sách thời gian và tiền |
| 15 | G16 Bộ giải OPTW học máy không chuyển được sang thành phố khác | 5 (3 khác lĩnh vực) | Mở (a) | "A Reinforcement Learning Approach to the Orienteering Problem with Time Windows" (mỗi vùng một mô hình) | Một mô hình dùng cho thành phố thật chưa thấy |
| 16 | G15 Lịch trình cho nhóm, gia đình có sở thích khác nhau | 5 (3 nhóm; 1 chưa kiểm) | Mở (a) | "Towards Next Generation Touring: Personalized Group Tours" (ghi chú chưa kiểm) | Lịch trình chung có đoạn tách rồi nhập lại, công bằng cho từng người |
| 17 | G17 Lịch trình thành phố ít phát thải | 4 (1 chưa kiểm) | Mở (a) | "Multi-day tourist trip design for battery electric vehicles with chance-constraint programming" (ghi chú chưa kiểm) | Đường đánh đổi lợi ích và CO2 khi chọn phương tiện từng chặng |

Lý do các gap từ hạng 6 trở xuống không vào top 5:
- **G10:** bằng chứng là lời kêu gọi chung; kỹ thuật giải thích tổng quát có vẻ đã có (chưa kiểm).
- **G09:** khớp với cờ trong nhà/ngoài trời và thời tiết, nhưng thiếu dấu thời gian lượt ghé và nhãn "giờ đẹp nhất" cho TP.HCM; phần mưa đã nằm trong G01.
- **G14, G13, G11:** cần người chấm hoặc kho lịch trình thật.
- **G03:** không có dữ liệu về phân phối thời gian; hai nguồn chưa kiểm.
- **G08, G07, G15, G17:** chính phát biểu gap đã ghi "có thể đã có mô hình tương tự, cần kiểm".
- **G12:** không có dữ liệu sức chứa, chỉ mô phỏng được.
- **G16:** chi phí huấn luyện cao so với 8-12 tuần; 3/5 nguồn thuộc lĩnh vực khác.

## 3. Top 5 gap đáng theo nhất (chưa gap nào được xác nhận là còn mở)

Hạng B của các hội nghị dưới đây ghi theo trí nhớ về bảng CORE gần nhất; cần tra lại trên cổng CORE trước khi chọn nơi nộp.

### 3.1. G01: Sửa lịch trình giữa chuyến sau một sự cố, thay đổi ít nhất

**Giải thích.** Bộ lập lịch hiện nay làm việc trước chuyến đi. Khi đang đi mà một điểm đóng cửa, bị trễ hay trời mưa, người đi cần một bản sửa nhanh và giữ gần nguyên phần còn lại của ngày. LLM sửa thì càng kém khi kế hoạch càng dài.

**Ví dụ TP.HCM.** Buổi chiều đã lên lịch: 13:30 Thảo Cầm Viên, 15:30 Bưu điện Trung tâm, 17:00 phố đi bộ Nguyễn Huệ. 13:20 trời mưa lớn, Thảo Cầm Viên (ngoài trời) không đi được. Bản sửa tốt chỉ thay một điểm, ví dụ vào Bảo tàng Lịch sử ngay cạnh đó (trong nhà), và giữ nguyên hai điểm sau.

**Bằng chứng** (7 nguồn từ 7 nhóm; 2 đọc toàn văn, 5 qua tóm tắt):
- Lim et al. (2019): hướng mở là tour tự thích nghi trong chuyến theo thời tiết, mệt mỏi, tắc nghẽn.
- Bellogin et al. (2025), P12: thuật toán không thích nghi giữa chuyến; lập lại kế hoạch giữa chuyến vẫn là khoảng trống.
- Ruiz-Meza and Montoya-Torres (2022): cần tối ưu trực tuyến cho lập kế hoạch theo ngữ cảnh thời gian thực.
- Survey orienteering (arXiv 2512.16865): định tuyến lại động.
- "TripTide: A Benchmark for Adaptive Travel Planning under Disruptions" (Karmakar et al.; arXiv 2510.21329): LLM xử lý sự cố kém dần khi kế hoạch dài; bản sửa hời hợt, không lan sang các điểm sau; không có baseline tối ưu.
- "TRIP-PAL: Travel Planning with Guarantees by Combining LLMs and Automated Planners" (de la Rosa et al., arXiv 2024): việc tương lai là tích hợp giao thông và thời tiết thời gian thực.
- "ITINERA: Integrating Spatial Optimization with LLMs for Open-domain Urban Itinerary Planning" (Tang et al.; arXiv 2402.07204): yếu về ra quyết định thời gian thực.

**Bài gần nhất và khác biệt.** Trong kho là TripTide: benchmark đo LLM sửa kế hoạch, không đề xuất phương pháp, không so với tối ưu. G01 là một phương pháp tối ưu có phạt cho mỗi thay đổi và giữ cứng khung giờ. Ngoài kho thì chưa biết; hai mảng phải kiểm trước là orienteering động/trực tuyến và sửa kế hoạch có phạt độ lệch.

**Bài toán nhỏ.**
- Đầu vào: phần còn lại của lịch trình một ngày (POI kèm điểm lợi ích, khung giờ mở cửa, giờ dự kiến); giờ và vị trí hiện tại; các POI ứng viên chưa dùng; một sự cố (một POI đóng cửa, trễ X phút, hoặc các POI ngoài trời không dùng được).
- Quyết định: dãy POI còn lại sau khi sửa và giờ đến từng điểm.
- Mục tiêu: tối đa tổng lợi ích còn lại trừ mức phạt cho mỗi thay đổi so với kế hoạch gốc (bỏ, thêm, đổi thứ tự một POI).
- Ràng buộc: đến mọi POI trong khung giờ mở cửa; tính đủ thời gian đi và tham quan; xong trước giờ kết thúc ngày; trả lời trong khoảng 1 giây.

**Hướng tiếp cận khả dĩ.**
1. Tìm trong phạm vi k phép sửa quanh kế hoạch gốc (bỏ, chèn, đổi chỗ, dời giờ), tăng dần k đến khi hết 1 giây. Cho được bảo đảm "tốt nhất trong k phép sửa".
2. Mô hình chính xác có số hạng phạt thay đổi, dùng làm mốc trên ca nhỏ và để vẽ đường đánh đổi giữa lợi ích và số thay đổi.
3. Vá cục bộ trước: sửa đoạn quanh điểm hỏng bằng thời gian dư của các điểm phía sau, chỉ nới vùng sửa khi vá không khả thi.

**Thí nghiệm.**
- Dữ liệu: benchmark OPTW/TOPTW (lấy một lời giải tốt làm kế hoạch gốc, cắt tại một thời điểm, chèn sự cố đóng cửa hoặc trễ). Bộ POI TP.HCM với giờ mở cửa và cờ trong nhà/ngoài trời; sự cố mưa lấy từ các giờ mưa thật trong lịch sử thời tiết theo giờ.
- Baseline: tối ưu lại toàn bộ phần còn lại; bỏ điểm hỏng rồi đi tiếp; LLM sửa trên các sự cố kiểu TripTide.
- Metric: lợi ích còn lại so với tối ưu lại toàn bộ; số thay đổi; tỉ lệ bản sửa khả thi; thời gian trả lời.

**Độ khó, khả thi.** Khả thi cao, không cần gán nhãn tay. Chia tuần gợi ý: 1-2 kiểm phản chứng và chốt mô hình; 3-4 dữ liệu, bộ sinh sự cố, baseline; 5-8 phương pháp và thí nghiệm; 9-12 viết. Ba rủi ro:
- Có thể đã có bài trong mảng orienteering động.
- Bài toán một ngày khá nhỏ nên tối ưu lại toàn bộ có thể đã đủ nhanh. Khi đó điểm mới phải là "ít thay đổi", không phải tốc độ; cần đo ngay ở tuần 3.
- Bộ TP.HCM không có thời lượng tham quan và thời gian di chuyển, phải đặt giả định và ghi rõ.

**Hội nghị hạng B.** ICTAI, PRICAI; EvoCOP hoặc IEEE CEC nếu phương pháp là metaheuristic; CPAIOR nếu có mô hình chính xác.

### 3.2. G02: Kiểm tra và sửa lịch trình do LLM viết bằng dữ liệu thời gian thật

**Giải thích.** Lịch trình do LLM viết đọc rất trôi chảy nhưng không ai kiểm với giờ mở cửa, thời gian đi thật và thời lượng tham quan. Chưa ai biết bao nhiêu phần trăm lịch trình như vậy không đi được ở một thành phố thật, và chưa có cách chuẩn để sửa chúng bằng ít chỉnh sửa.

**Ví dụ TP.HCM.** Một kế hoạch do LLM viết: 9:00 Dinh Độc Lập (20 phút), 9:30 Địa đạo Củ Chi, 12:00 ăn trưa ở chợ Bến Thành, 18:30 Bảo tàng Mỹ thuật. Củ Chi cách trung tâm hàng chục cây số nên không thể tới sau 10 phút. 20 phút cho Dinh Độc Lập là quá ngắn. Nếu bảo tàng đóng cửa lúc 17:00 thì 18:30 đến là cửa đóng.

**Bằng chứng** (8 nguồn; 1 đối chiếu toàn văn, 7 qua tóm tắt):
- "TripTailor: A Real-World Benchmark for Personalized Travel Planning" (2025): kế hoạch LLM có khoảng cách trung bình giữa hai điểm liên tiếp khoảng 17 km, kế hoạch thật là 7,3 km; 61-65% đạt về thời lượng tham quan; không kiểm giờ mở cửa và trùng khung giờ.
- "TravelPlanner: A Benchmark for Real-World Planning with Language Agents" (Xie et al., ICML 2024): môi trường thử không có giờ mở cửa, thời lượng tham quan, thời gian đi trong thành phố.
- ITINERA: LLM yếu về suy luận không gian; thời lượng ở lại và thời gian đi để cho nghiên cứu sau.
- "ATLAS: Constraints-Aware Multi-Agent Collaboration for Real-World Travel Planning" (2025): việc tương lai là thêm bộ giải ràng buộc hình thức vào bộ kiểm tra; lỗi còn lại là tuyến phi lý và chi tiết bịa.
- TRIP-PAL: thời lượng do GPT-4 ước lượng, thời gian đi gán ngẫu nhiên, không có giờ mở cửa, chỉ một ngày.
- TripTide: chuyên gia xem lại thấy các bản sửa bỏ qua giờ hoạt động.
- Bellogin et al. (2025), P15: gợi ý dựa trên LLM khó kiểm chứng.
- "LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks" (Kambhampati et al., ICML 2024): LLM không tự kiểm được kế hoạch của mình, cần bộ phê bình bên ngoài.

**Bài gần nhất và khác biệt.** Trong kho là ATLAS (có bộ kiểm tra, chưa có bộ giải hình thức) và TRIP-PAL (có bảo đảm nhưng dữ liệu thời gian là giả định). Chưa bài nào trong kho kiểm kế hoạch với giờ mở cửa và thời gian đi thật của một thành phố, hay sửa một kế hoạch có sẵn bằng ít phép sửa nhất. Ngoài kho thì chưa biết. Phải kiểm trước ChinaTravel, TripCraft và các bộ lập kế hoạch dùng bộ giải SMT; đây là tên cần tra, chưa phải bằng chứng.

**Bài toán nhỏ.**
- Đầu vào: một lịch trình một ngày do LLM viết (văn bản tự do hoặc JSON); cơ sở dữ liệu POI có giờ mở cửa, thời lượng tham quan điển hình và ma trận thời gian đi.
- Quyết định: (a) gắn nhãn từng vi phạm: POI không có thật, đến lúc đóng cửa, tham quan quá ngắn, không kịp đi giữa hai điểm, quá quỹ thời gian của ngày; (b) một lịch trình khả thi với ít phép sửa nhất.
- Mục tiêu: precision/recall phát hiện vi phạm trên tập gán nhãn tay; tỉ lệ kế hoạch khả thi sau sửa; số phép sửa; phần lợi ích giữ được.
- Ràng buộc: bản sửa chỉ dùng POI có trong cơ sở dữ liệu và thoả giờ mở cửa, thời lượng tối thiểu, thời gian đi, quỹ thời gian của ngày.

**Hướng tiếp cận khả dĩ.**
1. Bộ kiểm tra tất định cộng một bài toán tối ưu "ít phép sửa nhất" (dời giờ, đổi thứ tự, thay bằng POI tương tự gần đó, bỏ).
2. Vòng phản hồi theo khung LLM-Modulo: trả danh sách lỗi cho LLM viết lại; có thể lai, LLM đề xuất điểm thay thế còn bộ tối ưu xếp giờ.
3. Mã hoá thành bài toán ràng buộc mềm, giữ càng nhiều phần của kế hoạch gốc càng tốt (đúng hướng ATLAS nêu).

**Thí nghiệm.**
- Dữ liệu: vài trăm lịch trình một ngày cho TP.HCM do 2-3 LLM viết; bộ POI TP.HCM làm cơ sở dữ liệu; 100-150 lịch trình gán nhãn tay. TravelPlanner chỉ dùng làm nguồn mẫu yêu cầu, vì môi trường của nó không có giờ mở cửa.
- Baseline: LLM tự kiểm; LLM viết lại khi được báo lỗi; bỏ các điểm vi phạm; lập lại từ đầu bằng bộ tối ưu.
- Metric: tỉ lệ vi phạm theo từng loại; precision/recall; tỉ lệ khả thi sau sửa; số phép sửa; lợi ích giữ được.

**Độ khó, khả thi.** Vừa. Phần tốn công là khớp tên POI trong văn bản tự do với cơ sở dữ liệu, gán nhãn tay, và dựng thời lượng tham quan cùng ma trận thời gian đi (bộ TP.HCM chưa có). Rủi ro bị trùng cao nhất trong năm gap vì mảng này ra bài rất nhanh. Bằng chứng nhiều nhưng gần như toàn đọc qua tóm tắt. Kết quả phụ thuộc phiên bản LLM, nên phải cố định phiên bản và công bố các lịch trình đã sinh.

**Hội nghị hạng B.** COLING, PRICAI, ICTAI, IJCNN.

### 3.3. G05: Giờ mở cửa và tình trạng hoạt động của POI cũ, mâu thuẫn

**Giải thích.** Dữ liệu POI chứa những nơi đã đóng hẳn hoặc dời đi, giờ mở cửa không ai kiểm, và các nguồn bản đồ nói khác nhau. Bộ lập lịch vẫn coi giờ mở cửa là chắc chắn, nên một điểm sai có thể làm hỏng cả ngày.

**Ví dụ TP.HCM.** Một quán cà phê sân vườn ở Quận 3: nguồn A ghi mở 7:00-22:00 nhưng lần sửa cuối là năm 2021; nguồn B ghi 8:00-17:00; bài đánh giá gần nhất cách đây hai năm. Kết quả mong muốn không phải một giờ mở cửa "đúng" mà là "thứ Ba lúc 19:00, xác suất quán mở là 35%".

**Bằng chứng** (6 nguồn; 4 nguồn độc lập do tác giả nêu; 3 có toàn văn, 2 qua tóm tắt, 1 chưa kiểm):
- Bellogin et al. (2025), P1, P2: dữ liệu công khai thường cũ hơn mười năm nên POI đã đóng hoặc dời làm sai mô hình; địa điểm check-in có thể khác xa thực địa.
- "Point-of-Interest (POI) Data Validation Methods: An Urban Case Study" (Yeow et al.; ISPRS IJGI 2021): giờ mở cửa được nêu là một phần của chất lượng thời gian nhưng không được đánh giá; dữ liệu tham chiếu khó có.
- "Using OpenStreetMap POI data to model urban change - a feasibility study" (Zhang & Pfoser, PLOS ONE 2019): không có dữ liệu chuẩn chính thức về mở và đóng cửa; cả hai nguồn đều do cộng đồng đóng góp.
- "A Bayesian Approach to Discovering Truth from Conflicting Sources for Data Integration" (Zhao et al., PVLDB 2012; tích hợp dữ liệu nói chung): mô hình giả định mỗi nguồn có một chất lượng cố định; tác giả đề xuất chất lượng theo từng thực thể.
- TripTide: đóng cửa, đổi giờ, số ngày mở hạn chế là các loại sự cố được liệt kê.
- "FSQ Places: improved Closed model" (Foursquare blog, 2023): ghi chú chưa kiểm; mô hình của nhà cung cấp, không công bố phương pháp.

**Bài gần nhất và khác biệt.** Trong kho là Yeow et al. (2021): kiểm định dữ liệu POI nhưng bỏ qua giờ mở cửa. Zhao et al. (2012) cho khung gộp nguồn mâu thuẫn nhưng không cho xác suất theo từng giờ. Ngoài kho thì chưa biết; cần kiểm mảng dự đoán POI đóng hẳn và suy giờ mở cửa từ dữ liệu check-in.

**Bài toán nhỏ.**
- Đầu vào: với mỗi POI, các bản ghi giờ mở cửa và tín hiệu còn hoạt động từ ít nhất hai nguồn (ví dụ thẻ OSM và ngày sửa, một API bản đồ thương mại, thời điểm của đánh giá hoặc ảnh gần nhất); một mẫu nhỏ kiểm tay.
- Đầu ra: xác suất mở cho mỗi POI, mỗi thứ trong tuần, mỗi giờ.
- Mục tiêu: độ hiệu chỉnh và log loss theo từng ô giờ so với mẫu kiểm tay; so với dùng một nguồn và bỏ phiếu đa số.
- Ràng buộc: POI đã đóng hẳn thì xác suất mở bằng 0 ở mọi giờ; không dùng lẫn mẫu kiểm tay giữa huấn luyện và chấm điểm.

**Hướng tiếp cận khả dĩ.**
1. Mô hình Bayes về độ tin của nguồn, cho độ tin thay đổi theo loại POI và tuổi bản ghi (đúng hướng mở Zhao et al. nêu).
2. Bộ phân loại có hiệu chỉnh cho từng ô giờ; đặc trưng là các nguồn nói gì, có khớp nhau không, bản ghi cũ bao lâu, loại POI.
3. Coi mỗi nguồn là một người bỏ phiếu có nhiễu, ước lượng độ đúng của từng nguồn mà không cần nhãn; mẫu kiểm tay chỉ để chấm điểm.

**Thí nghiệm.**
- Dữ liệu: bộ POI TP.HCM (900-1.900 điểm) với giờ mở cửa từ ít nhất hai nguồn; 200-300 POI kiểm tay (gọi điện, đến nơi, trang chính thức), chia theo loại và khu vực.
- Baseline: từng nguồn đơn lẻ; bỏ phiếu đa số; lấy bản ghi mới nhất.
- Metric: log loss, Brier, biểu đồ hiệu chỉnh theo ô giờ; precision/recall phát hiện POI đóng hẳn; tỉ lệ lịch trình ghé phải điểm đóng cửa khi lập bằng một nguồn so với lập bằng xác suất.

**Độ khó, khả thi.** Vừa. Chi phí chính là mẫu kiểm tay (khoảng 2 tuần) và nguồn giờ mở cửa thứ hai; phải đọc điều khoản sử dụng của API bản đồ trước khi lấy. Cần kiểm ngay bộ POI hiện giữ giờ mở cửa từ mấy nguồn. Điểm yếu: chỉ có 2-3 nguồn thì bỏ phiếu đa số gần như vô nghĩa, và mẫu 200-300 POI cho kết luận thống kê không mạnh.

**Hội nghị hạng B.** DASFAA, WISE, PAKDD, IEEE BigData.

### 3.4. G04: Thời lượng tham quan cho POI ít khách và theo ngữ cảnh

**Giải thích.** Bộ lập lịch gán cho mỗi POI một thời lượng trung bình, lấy từ dấu thời gian ảnh hoặc check-in vốn thưa và không đáng tin. POI ít khách không có mẫu nào, và thời lượng không đổi theo ngày, giờ hay độ đông.

**Ví dụ TP.HCM.** Bảo tàng Chứng tích Chiến tranh có nhiều lượt khách nên ước lượng được. Một ngôi chùa nhỏ ở Chợ Lớn thì không có mẫu nào. Gán "chùa = 30 phút" cho mọi ngôi chùa thì lịch trình hoặc thừa giờ hoặc trễ điểm sau. Kết quả mong muốn: "chùa này, sáng Chủ nhật: 25-60 phút, đúng trong 80% trường hợp".

**Bằng chứng** (8 nguồn; 5 nguồn do tác giả nêu từ 3 nhóm độc lập; 3 đọc toàn văn, 4 qua tóm tắt, 1 chưa kiểm):
- "Personalized trip recommendation for tourists based on user interests, POI visit durations and visit recency" (Lim et al., 2018): việc tương lai là mô hình độ bất định của thời lượng theo thứ và giờ trong ngày.
- "POIBERT: A Transformer-based Model for the Tour Recommendation Problem" (Ho and Lim, 2022): thời lượng dao động rộng, trung bình không dùng được, POI ít khách có ít mẫu; thời lượng sai làm méo lịch trình có giới hạn thời gian.
- Halder et al. (2024): thời gian ở POI suy từ dấu thời gian ảnh; cần nguồn khác.
- ITINERA: thời lượng ở lại để cho nghiên cứu sau.
- TripTailor: chỉ 61-65% kế hoạch LLM (72% với baseline quy trình) cho thời lượng hợp lý.
- Bellogin et al. (2025), P5: dấu thời gian Flickr và thời điểm đánh giá không đáng tin.
- TRIP-PAL: thời lượng do GPT-4 ước lượng.
- "About popular times, wait times and visit duration data" (Google Business Profile Help, 2025): ghi chú chưa kiểm; thời lượng chỉ hiện cho nơi có đủ lượt ghé.

**Bài gần nhất và khác biệt.** Trong kho là Lim et al. (2018), bài đưa thời lượng tham quan vào gợi ý lịch trình, và POIBERT, bài nói rõ trung bình là không dùng được. Cần đọc lại xem POIBERT đã ước lượng thời lượng bằng cách nào. Chưa bài nào trong kho cho khoảng thời lượng đối với POI không có mẫu hoặc theo ngữ cảnh. Ngoài kho thì chưa biết; mảng cần kiểm là dự đoán thời gian lưu lại (dwell time).

**Bài toán nhỏ.**
- Đầu vào: thuộc tính POI (loại, quy mô, mức giá, điểm đánh giá, đường độ đông theo giờ nếu có); ngữ cảnh (ngày thường hay cuối tuần, giờ đến); mẫu thời lượng chỉ có ở một phần POI.
- Đầu ra: phân phối hoặc khoảng 80% của thời lượng cho bất kỳ POI và ngữ cảnh nào, kể cả POI không có mẫu.
- Mục tiêu: độ phủ của khoảng và pinball loss trên POI và ngữ cảnh để riêng; phụ: lịch trình lập bằng ước lượng này bị quá giờ ít hơn bao nhiêu so với dùng trung bình theo loại.
- Ràng buộc: POI dùng để chấm không có mẫu nào trong lúc huấn luyện.

**Hướng tiếp cận khả dĩ.**
1. Gộp phân cấp: POI ít mẫu mượn thông tin từ loại và từ các POI giống nó; POI không mẫu lấy phân phối của loại, điều chỉnh theo thuộc tính.
2. Hồi quy phân vị theo thuộc tính và ngữ cảnh, rồi hiệu chỉnh khoảng để đạt đúng độ phủ.
3. Mượn mẫu có trọng số từ các POI gần nhất trong không gian thuộc tính.

**Thí nghiệm.**
- Dữ liệu: các bộ Flickr của Lim et al., để riêng theo POI và theo thành phố. Bộ TP.HCM không có mẫu thời lượng nên chỉ dùng cho thí nghiệm phụ về lịch trình.
- Baseline: trung bình toàn cục; trung bình theo loại (cách làm hiện nay); trung bình của chính POI khi có mẫu.
- Metric: độ phủ của khoảng 80%, pinball loss, độ rộng khoảng; tỉ lệ lịch trình quá giờ trong mô phỏng.

**Độ khó, khả thi.** Dễ thực hiện vì chỉ dùng dữ liệu công khai. Điểm yếu nằm ở dữ liệu: nhãn thời lượng đến từ dấu thời gian ảnh mà chính Bellogin et al. gọi là không đáng tin, và cần đếm số POI, số mẫu, số thuộc tính trong các bộ Flickr trước khi chốt. Có khả năng không mô hình nào thắng rõ trung bình theo loại.

**Hội nghị hạng B.** PAKDD, DASFAA, IEEE BigData.

### 3.5. G06: Khách mới chưa có lịch sử, học sở thích bằng vài câu hỏi

**Giải thích.** Gần như mọi người dùng ứng dụng lịch trình là khách lần đầu đến, không có lịch sử ở thành phố đó, còn mô hình gợi ý lại học chủ yếu từ check-in của dân địa phương. Chưa có cách thống nhất để hỏi vài câu rồi ra ngay một lịch trình hợp người đó.

**Ví dụ TP.HCM.** Một khách lần đầu đến TP.HCM hai ngày. Thay vì bắt điền bảng dài, ứng dụng hỏi 4 câu như "Chợ Bến Thành hay Bảo tàng Mỹ thuật?", "Một buổi chiều ở Chợ Lớn hay ở Thảo Điền?", cho phép trả lời "sao cũng được". Câu hỏi nghiên cứu: hỏi câu nào trước để sau ít câu nhất lịch trình đã gần với lịch trình lý tưởng của họ.

**Bằng chứng** (7 nguồn: 3 survey, 4 bài hệ thống, 5 nhóm độc lập; 3 có toàn văn, 4 qua tóm tắt):
- Lim et al. (2019): khởi đầu lạnh cho người dùng mới không có lịch sử du lịch; cần cơ chế lấy phản hồi trực tiếp.
- Halder et al. (2024): khởi đầu lạnh với người dùng mới vẫn chưa giải.
- Bellogin et al. (2025), P2, P3, P7, P18: dữ liệu huấn luyện chủ yếu là dân địa phương, rất thưa, thiếu mục đích chuyến đi và bối cảnh nhóm; không đánh giá điều kiện khởi đầu lạnh.
- "Personalized and situation-aware multimodal route recommendations: the FAVOUR algorithm" (Campigotto et al., 2016; bài toán chọn tuyến): việc tương lai là chọn câu hỏi để giảm số lần so sánh phải hỏi, và mô hình hoá trường hợp không có sở thích.
- TripTailor: yêu cầu chỉ một lượt và do LLM viết, trong khi lập kế hoạch thật là nhiều lượt.
- TRIP-PAL: điểm lợi ích của POI là ước lượng của GPT-4 về ý kiến chung của du khách, không phải của người dùng.
- ATLAS: việc tương lai là mô hình hoá sở thích cá nhân.

**Bài gần nhất và khác biệt.** Trong kho là FAVOUR: học sở thích qua so sánh, nhưng cho bài toán chọn tuyến, không phải chọn và xếp thứ tự POI có khung giờ; việc chọn câu hỏi được để lại. Ngoài kho thì chưa biết. Mảng khai thác sở thích bằng câu hỏi có lịch sử dài ở ngoài du lịch, nên đây là gap dễ gặp bài đã làm một phần nhất trong năm gap.

**Bài toán nhỏ.**
- Đầu vào: các POI của một thành phố kèm thuộc tính; một khách mới không có lịch sử; tối đa k câu hỏi (chọn giữa hai POI hoặc hai lịch trình ngắn, được trả lời "không thiên bên nào").
- Quyết định: câu hỏi tiếp theo, rồi lịch trình cuối cùng.
- Mục tiêu: giảm regret, tức lợi ích của lịch trình lập khi biết hết sở thích trừ lợi ích của lịch trình trả về, tính theo k.
- Ràng buộc: không quá k câu hỏi; lịch trình thoả quỹ thời gian và giờ mở cửa.

**Hướng tiếp cận khả dĩ.**
1. Chọn câu hỏi mà câu trả lời làm lịch trình cuối thay đổi nhiều nhất, thay vì câu làm giảm độ bất định về sở thích nhiều nhất.
2. Mô hình Bayes trên trọng số sở thích theo loại POI, chọn câu hỏi theo lượng thông tin, có xử lý câu trả lời "sao cũng được".
3. Cho so sánh hai lịch trình ngắn và cập nhật trọng số sau mỗi lần chọn.

**Thí nghiệm.**
- Dữ liệu: du khách mô phỏng dựng từ lịch trình thật trong các bộ Flickr của Lim et al.; bộ POI TP.HCM cho một thử nghiệm nhỏ với 10-20 người.
- Baseline: không hỏi gì (lịch trình theo độ nổi tiếng); hỏi ngẫu nhiên; bảng hỏi cố định theo loại POI.
- Metric: regret theo k; số câu hỏi cần để regret xuống dưới một ngưỡng; với người thật, họ chọn lịch trình nào khi so mù.

**Độ khó, khả thi.** Vừa. Mô phỏng thì rẻ và dùng lại được bộ giải lịch trình. Điểm yếu: du khách mô phỏng có thể không giống khách thật (Bellogin et al. đã cảnh báo về dữ liệu), nên cần thêm thử nghiệm với người thật.

**Hội nghị hạng B.** PRICAI, ICTAI, ACM SAC; UMAP (cần tra lại hạng).

## 4. Đề xuất

**Tốt nhất: G01.**
- Bằng chứng đến từ nhiều phía nhất: survey du lịch, survey vận trù học và benchmark LLM, 7 nhóm khác nhau, cùng chỉ vào một chỗ.
- Khớp hoàn toàn với dữ liệu đang có: benchmark OPTW/TOPTW, giờ mở cửa và cờ trong nhà/ngoài trời của bộ TP.HCM, lịch sử thời tiết theo giờ để tạo sự cố mưa thật. Không cần thu thập hay gán nhãn thêm.
- Đúng dạng "một bài toán nhỏ, một phương pháp mới": một bài toán tối ưu, có lời giải chính xác trên ca nhỏ để đối chiếu, baseline rõ ràng.
- Chỗ bằng chứng còn mỏng: 5/7 nguồn chỉ đọc qua tóm tắt, kể cả TripTide, nguồn của nhận định "không có baseline tối ưu".

**Dự phòng: G05.**
- Rủi ro độc lập với G01: đây là bài toán ước lượng dữ liệu, không dùng lõi sửa lịch trình, nên lý do làm G01 đổ không kéo G05 theo.
- Bộ POI TP.HCM là đối tượng nghiên cứu trực tiếp, và mẫu kiểm tay tự làm cho nhãn đáng tin.
- Kết quả dùng lại được: xác suất mở là đầu vào cho G01 và G03.
- Chỗ mỏng: chỉ 4 nguồn độc lập, trong đó Zhao et al. (2012) là bài tích hợp dữ liệu nói chung và đã cũ; tốn khoảng 2 tuần kiểm tay.

**Vì sao không chọn G02 làm dự phòng dù xếp hạng 2.** G02 dùng chung lõi "sửa ít thay đổi" với G01, nên lý do nào làm G01 đổ thì phần lớn cũng làm G02 yếu đi. G02 hợp làm thí nghiệm thứ hai của G01 hơn (chạy cùng bộ sửa trên lịch trình do LLM viết), nếu tuần 8 đã xong phần chính.

**Ba việc phải làm trong tuần 1.**
1. Chạy lại các truy vấn phản chứng của G01 và G05. Nếu có bài đã gộp đủ sửa giữa chuyến, phạt thay đổi và khung giờ cứng thì chuyển sang G05.
2. Đọc toàn văn TripTide và Bellogin et al. (2025).
3. Kiểm bộ POI TP.HCM giữ giờ mở cửa từ mấy nguồn. Nếu chỉ một nguồn và không lấy được nguồn thứ hai thì dự phòng đổi thành G04, vì G04 chỉ cần dữ liệu công khai.

Truy vấn đã soạn sẵn:
- G01: `tourist itinerary replanning after disruption minimal change orienteering time windows`; `dynamic tourist trip design problem real-time re-optimization POI closure delay`; `plan repair stability deviation penalty orienteering problem rescheduling`; `adaptive travel planning under disruptions optimization baseline TripTide`; `online orienteering problem with time windows re-routing tourist weather`.
- G05: `opening hours data quality validation OpenStreetMap Google Places accuracy`; `truth discovery opening hours conflicting sources POI`; `POI permanently closed detection multi-source prediction`; `infer business opening hours from mobility or check-in data`; `POI data currency temporal quality assessment business hours`.
