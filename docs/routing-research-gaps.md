# Khoảng trống nghiên cứu về lập lộ trình du lịch cá nhân hoá cho TP.HCM (Journie), xuất phát từ bài M2G4RTP

> **Phạm vi và mức kiểm chứng.** Tài liệu này chỉ dùng 55 bài đã được kiểm tra thư mục, liệt kê ở mục 5.
> - Bài M2G4RTP được đọc toàn văn từ bản PDF.
> - Hầu hết các bài còn lại chỉ được kiểm ở mức tóm tắt (abstract) và siêu dữ liệu. Mọi nhận định về một bài khác được hiểu ở mức đó, trừ khi có ghi chú khác.
> - Những chỗ bằng chứng mỏng hoặc thông tin thư mục còn phải kiểm lại đều được ghi rõ.
> - Câu "không tìm thấy bài nào về X" nghĩa là không có trong tập bài đã tìm, chứ không chứng minh rằng chưa ai làm X.

---

## 1. Tóm tắt M2G4RTP và những gì mượn được cho du lịch

### 1.1 Bài toán và dữ liệu

Bài M2G4RTP [Cai et al., 2023] giải bài toán dự đoán lộ trình và thời gian (Route and Time Prediction, RTP) trong logistics tức thời của Cainiao:

- **Đầu vào:** tại thời điểm t, cho tập địa điểm mà một shipper chưa ghé.
- **Đầu ra:** thứ tự shipper sẽ thực sự đi qua các điểm đó, và thời gian từ t đến lúc tới từng điểm.

Dữ liệu dùng trong bài:

- Đơn lấy hàng ở Hàng Châu từ 10/7 đến 10/10/2021, gồm 8.600 AOI và 550 shipper.
- Một lộ trình dài tối đa 77 địa điểm và 45 AOI; trung bình 8,76 địa điểm và 4,34 AOI.
- Khi huấn luyện, tác giả chỉ giữ các mẫu có dưới 20 địa điểm và dưới 10 AOI.
- Chia dữ liệu theo ngày: 65 ngày huấn luyện, 17 ngày kiểm định, 10 ngày kiểm tra.

AOI (Area of Interest) là một khu vực có ý nghĩa trên bản đồ, ví dụ khu dân cư, toà văn phòng hay trung tâm thương mại.

Quan sát làm động lực cho bài: mỗi shipper mỗi ngày chuyển giữa các địa điểm trung bình 50,97 lần, nhưng chỉ chuyển giữa các AOI 6,20 lần. Tức là shipper thường xong hết một khu rồi mới sang khu khác.

### 1.2 Mô hình

**Bộ mã hoá đồ thị đa tầng.** Mô hình dùng hai đồ thị, đồ thị địa điểm và đồ thị AOI, nối với nhau bằng cạnh "địa điểm thuộc AOI".

- Đặc trưng nút gồm: toạ độ, khoảng cách tới shipper, mã và loại AOI, hạn giao, thời điểm nhận đơn, thời gian còn lại đến hạn.
- Đặc trưng cạnh gồm: khoảng cách Euclid, chênh lệch hạn giao giữa hai điểm, và tính kết nối. Hai điểm được coi là kết nối nếu là k láng giềng gần nhất về không gian hoặc về hạn giao.
- Đặc trưng toàn cục gồm: giờ làm và tốc độ trung bình của shipper, tỉ lệ đi làm, thời tiết, thứ trong tuần.
- Module GAT-e là một biến thể của graph attention có cập nhật cả embedding của cạnh.

**Bộ giải mã đa nhiệm.**

- Tầng AOI giải mã trước, rồi kết quả của nó dẫn đường cho tầng địa điểm.
- Thứ tự được sinh từng bước bằng LSTM kết hợp masked attention, theo kiểu pointer.
- Thời gian đến được tính bằng SortLSTM. SortLSTM nhận các nút theo thứ tự đã dự đoán, có thêm positional encoding, và không ép thời gian phải tăng dần, nhờ đó tự sửa được một phần lỗi thứ tự.
- Có bốn hàm loss: hai cross-entropy cho thứ tự và hai MAE cho thời gian, ở cả hai tầng. Trọng số giữa các loss được học tự động theo bất định đồng phương sai (homoscedastic uncertainty).

**Thước đo.**

- Cho thứ tự: HR@k (tỉ lệ k điểm đầu dự đoán đúng), KRC (tương quan hạng Kendall) và LSD (bình phương độ lệch vị trí).
- Cho thời gian: RMSE, MAE và acc@20 (tỉ lệ dự đoán sai dưới 20 phút).

### 1.3 Kết quả chính (trên toàn bộ tập kiểm tra)

| Phương pháp | HR@3 | KRC | LSD | MAE thời gian (phút) |
|---|---|---|---|---|
| Distance-Greedy | 64,08 | 0,49 | 6,78 | 50,08 |
| Time-Greedy | 61,09 | 0,50 | 6,80 | 45,31 |
| OR-Tools (đường ngắn nhất) | 62,18 | 0,44 | 7,93 | 48,94 |
| DeepRoute / Graph2Route | 70,08 | 0,60 | 4,86 | 26,70 / 26,67 |
| **M2G4RTP** | **72,21** | **0,62** | **4,25** | **25,44** |

- Thử bỏ từng thành phần (ablation) cho thấy: bỏ tầng AOI làm dự đoán thứ tự giảm rõ nhất; tách thành huấn luyện hai bước thì kém hơn huấn luyện đồng thời.
- Suy luận mất 0,61 ms, so với 0,39 ms của Graph2Route.
- Hệ thống đã triển khai ở Cainiao với hàng trăm nghìn truy vấn mỗi ngày. Số liệu online ở Thượng Hải: ETA có RMSE 31,11 và MAE 22,40 phút; dự đoán thứ tự có HR@3 66,89% và KRC 0,61.

**Lưu ý khi đọc bài (đọc phản biện):**

- Mức cải thiện nhỏ: HR@3 tăng khoảng 2 điểm so với baseline tốt nhất, MAE thời gian giảm khoảng 1,2 phút.
- Ngay cả mô hình tốt nhất cũng chỉ có 58,62% dự đoán thời gian sai dưới 20 phút. Sai số theo một con số duy nhất vẫn còn lớn.
- Bảng III có nhiều ô của DeepRoute và Graph2Route trùng nhau hoàn toàn, kể cả độ lệch chuẩn. Ví dụ hàng "all" của cả hai đều là 70,08 / 0,60 / 4,86. Có thể đây là lỗi sao chép, nên thận trọng khi trích số của các baseline này.
- Các baseline chỉ dự đoán thứ tự được gắn thêm một mạng 3 lớp để dự đoán thời gian, huấn luyện riêng. Vì vậy so sánh về thời gian phần nào có lợi cho M2G4RTP.
- Cạnh trong đồ thị dùng khoảng cách Euclid, không dùng thời gian di chuyển thật trên mạng đường.
- Trong bài không thấy nhắc đến việc công bố dữ liệu hay mã nguồn.

### 1.4 "Dự đoán lộ trình" khác "lập lộ trình tối ưu"

Chính bài báo phân biệt rõ hai việc này: kết quả lập lộ trình tối ưu thường khác đường người thật đi, nên không dùng trực tiếp làm dự đoán được. Bảng trên cho thấy điều đó: OR-Tools, dù tìm đường ngắn nhất, vẫn kém mọi mô hình học.

| | Dự đoán lộ trình (RTP, M2G4RTP) | Lập lộ trình tối ưu (TTDP/OP, Journie) |
|---|---|---|
| Đầu vào | Tập điểm bắt buộc phải ghé hết | Tập ứng viên lớn, phải chọn một tập con |
| Mục tiêu | Giống hành vi thật | Tối đa lợi ích dưới các ràng buộc |
| Cách học | Có giám sát, cần nhiều lộ trình lịch sử | Tối ưu tổ hợp, không cần lịch sử |
| Đánh giá | So với lộ trình thật (HR@k, KRC, LSD, MAE) | Giá trị mục tiêu và tính khả thi |
| Người dùng | Shipper lặp lại hằng ngày | Du khách thường chỉ đi một lần |

Journie thuộc cột bên phải. Tuy vậy, cách tiếp cận dự đoán vẫn có ích cho Journie ở ba chỗ:

1. Ước lượng thời gian (giờ đến, thời lượng ở mỗi điểm) để đưa vào bộ tối ưu.
2. Làm chi phí mềm về độ "tự nhiên" của lộ trình.
3. Làm thước đo, ví dụ so lịch đề xuất với lịch mà người dùng đã sửa.

### 1.5 Những gì mượn được

| Trong M2G4RTP | Tương ứng ở Journie |
|---|---|
| AOI (khu dân cư, toà nhà) | Khu du lịch, quận/phường, hoặc cụm POI theo mật độ (lõi Q1, Q3, Chợ Lớn, Thảo Điền...) |
| Location | POI |
| Tầng AOI dẫn đường cho tầng địa điểm | `/routing/days` (gán ngày, gán khu) dẫn đường cho `/routing` (thứ tự và giờ) |
| Hạn giao, chênh lệch hạn giao giữa hai điểm | Giờ mở và đóng cửa, chênh lệch giờ đóng cửa giữa hai POI |
| Đặc trưng toàn cục (thời tiết, thứ, tốc độ shipper) | Mưa, thứ/ngày lễ, nhịp độ chuyến đi, phương tiện |
| Hồ sơ shipper | Hồ sơ du khách (phân khúc cộng với phản hồi) |
| Dự đoán đồng thời thứ tự và thời gian | Dự đoán đồng thời thứ tự, giờ đến và thời lượng ở mỗi POI |
| HR@k, KRC, LSD, acc@k | So lịch đề xuất với lịch đã sửa; đo độ ổn định khi lập lại kế hoạch |
| Baseline Distance-Greedy, Time-Greedy, OR-Tools | Baseline không dùng học máy cho các thí nghiệm của Journie |

### 1.6 Những gì không mượn trực tiếp được

- **Dữ liệu:** mô hình cần dữ liệu lịch sử dày (550 shipper đi lặp lại trong 3 tháng). Journie không có dữ liệu quỹ đạo du khách tương đương.
- **Chọn điểm:** shipper phải ghé mọi điểm, còn du khách được chọn. Bài toán của Journie có thêm một tầng "chọn tập con" mà RTP không có.
- **Ràng buộc thời gian:** hạn giao là một mốc đơn, còn giờ mở cửa có thể tách ca và có cả giờ mở lẫn giờ đóng.

---

## 2. Bức tranh nghiên cứu theo 6 hướng

### A. Mô hình OP/TTDP và thuật toán heuristic (nền tảng)

Bài toán thiết kế chuyến du lịch (TTDP) thường được mô hình hoá bằng bài toán định hướng (orienteering problem, OP) và các biến thể:

- TOP: nhiều tour, tương ứng nhiều ngày.
- OPTW/TOPTW: có khung giờ (giờ mở cửa).
- OPHS: chọn khách sạn làm điểm cuối của mỗi ngày.

Thuật toán chủ đạo là heuristic như ILS, VNS hay PSO, vì cần trả lời trong vài giây. Journie về bản chất là một TOPTW nhiều ngày có thêm ràng buộc.

Tổng quan mới nhất [Shen et al., 2025a] nêu tính bền vững trước bất định (robustness), tính bền vững xã hội–môi trường (sustainability) và việc tích hợp AI là các thách thức còn mở. Đây là bằng chứng ở mức tóm tắt và là bản preprint.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Gavalas et al., 2014] | 2014 | J. Heuristics | Tổng quan mô hình và thuật toán TTDP | Trước giai đoạn học máy; mới kiểm siêu dữ liệu |
| [Gunawan et al., 2016] | 2016 | EJOR | Tổng quan các biến thể OP (TOPTW, phụ thuộc thời gian, ngẫu nhiên, theo cụm...) | Chỉ đến khoảng 2016; chỉ kiểm tóm tắt |
| [Ruiz-Meza & Montoya-Torres, 2022] | 2022 | Oper. Res. Perspectives | Tổng quan hệ thống về TTDP, đề xuất hướng tương lai | Chỉ kiểm tóm tắt |
| [Shen et al., 2025a] | 2025 | arXiv (preprint) | Tổng quan PRISMA giai đoạn 2017–2025, có cả phương pháp học (RL, mạng nơ-ron) | Chưa bình duyệt; chỉ đọc tóm tắt |
| [Vansteenwegen et al., 2009] | 2009 | Comput. Oper. Res. | ILS cho TOPTW, xen kẽ bước chèn và bước lắc | Thời gian di chuyển tĩnh; điểm lợi ích đơn giản |
| [Vansteenwegen et al., 2011] | 2011 | Expert Syst. Appl. | City Trip Planner đã triển khai thật; có giờ mở cửa và nghỉ trưa | Thời gian tĩnh; 5 thành phố Bỉ; chỉ kiểm tóm tắt |
| [Divsalar et al., 2013] | 2013 | Int. J. Prod. Econ. | VNS cho OPHS (nhiều ngày, chọn khách sạn) | Bỏ qua tiện ích của khách sạn; thời gian tĩnh; DOI cần kiểm |
| [Wu et al., 2024a] | 2024 | Omega | Lai PSO rời rạc, DE và tìm kiếm cục bộ; hai mục tiêu POI/khách sạn | Chỉ kiểm tóm tắt; có thể dùng thời gian tĩnh (chưa xác nhận) |
| [Ataei et al., 2024] | 2024 | Inf. Technol. Manag. | Phân tích cảm xúc review theo 15 khía cạnh và BWM, rồi giải OPHS hai mục tiêu | Trọng số theo phân khúc du khách, không theo từng người |

### B. Thời gian phụ thuộc giờ, bất định và ước lượng thời gian di chuyển

Có hai dòng nghiên cứu ít khi gặp nhau:

- **Dòng OP** mô hình hoá thời gian phụ thuộc giờ khởi hành (TD-OP) và bất định (OP ngẫu nhiên, OP robust). Hàm thời gian thường được coi là cho sẵn.
- **Dòng ETA bằng học máy** học thời gian từ dữ liệu GPS dày đặc của ô tô và taxi.

Dữ liệu cho giao thông chủ yếu là xe máy gần như vắng mặt. Bài duy nhất trong danh sách [Nguyen & Reinelt, 2017] làm cho Hà Nội và ở mức mô hình vĩ mô theo từng đoạn đường.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Gavalas et al., 2015] | 2015 | Comput. Oper. Res. | Heuristic theo cụm kết hợp ILS cho TOPTW phụ thuộc thời gian, dùng giao thông công cộng ở Athens | Chỉ có giao thông công cộng; không có bất định |
| [Verbeeck et al., 2017] | 2017 | Ann. Oper. Res. | Ant colony nhanh cho TD-OPTW, ra lời giải trong vài giây | Một tour; thời gian phụ thuộc giờ nhưng tất định |
| [Verbeeck et al., 2016] | 2016 | EJOR | TD-OPTW ngẫu nhiên: thời gian là hàm ngẫu nhiên của giờ khởi hành | Chưa đọc toàn văn; danh sách tác giả cần kiểm |
| [Varakantham et al., 2018] | 2018 | ACM TIST | OP ngẫu nhiên nhạy rủi ro: xấp xỉ trung bình mẫu (SAA), MILP và tìm kiếm cục bộ | Một du khách; kiểm trên công viên giải trí |
| [Shang et al., 2017] | 2017 | arXiv; Complexity 2020 | Tối ưu robust hai giai đoạn với tập bất định dạng hộp | Ví dụ nhỏ; không nhiều ngày |
| [Wang et al., 2018] | 2018 | AAAI | DeepTTE: geo-convolution và RNN, học đa nhiệm thời gian cả lộ trình lẫn từng đoạn | Cần GPS taxi dày đặc |
| [Fu et al., 2020] | 2020 | KDD | CompactETA: GAT chưng cất thành MLP, suy luận dưới 100 µs | Chỉ đọc trang tóm tắt AMiner |
| [Hu et al., 2022] | 2022 | arXiv (Uber) | DeeprETA: học phần dư giữa ETA của routing engine và thực tế | Xe ô tô; chỉ đọc đoạn trích |
| [Nguyen & Reinelt, 2017] | 2017 | Springer (HPSC 2015) | Hàm kiểu BPR cho giao thông hỗn hợp xe máy, có thời gian chờ đèn | Hà Nội; mức vĩ mô, không phải ETA |
| [Campigotto et al., 2016] | 2016 | arXiv / IEEE T-ITS | FAVOUR: học hồ sơ Bayes cho lựa chọn phương tiện có xét thời tiết | Mẫu nhỏ; phương tiện kiểu châu Âu |

### C. Dự đoán lộ trình–thời gian (RTP) và định tuyến bằng học máy

Dòng logistics phát triển rất nhanh từ OSquare (2019), qua DeepRoute, FDNET, Graph2Route, đến M2G4RTP, DRL4Route và MRGRP. Có hai lý do:

- Có dữ liệu công nghiệp lớn, sau này có cả dữ liệu mở là LaDe.
- Có bộ thước đo chung, được hệ thống hoá trong tổng quan [Wen et al., 2023].

Hai bài nối sang bài toán lập lộ trình:

- [Liu et al., 2023]: mô hình ngôn ngữ học thứ tự giữa các vùng, còn bộ giải TSP sắp thứ tự trong vùng.
- [Gama & Fernandes, 2021]: RL cho OPTW du lịch. Đây là cầu nối gần nhất giữa học máy và TTDP trong danh sách, nhưng mới là preprint.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Zhang et al., 2019] | 2019 | IMWUT | OSquare: mô hình cây tăng cường (gradient boosting) dự đoán điểm kế tiếp; phát hiện "khoảng cách cảm nhận" là yếu tố chính | Tham lam từng bước; không dự đoán thời gian |
| [Gao et al., 2021] | 2021 | KDD | FDNET: LSTM và attention, dự đoán thứ tự và thời gian theo hai bước | Mô hình chuỗi; lỗi tích luỹ qua hai bước |
| [Wen et al., 2022b] | 2022 | ACM TIST | DeepRoute+: Transformer với pointer, thêm đặc trưng cá nhân của shipper | Không dự đoán thời gian |
| [Wen et al., 2022a] | 2022 | KDD | Graph2Route: GNN động, mã hoá lại các điểm còn lại sau mỗi bước | Bắt chước hành vi lịch sử |
| [Cai et al., 2023] | 2023 | ICDE | M2G4RTP (xem mục 1) | Xem mục 1.3 và 1.6 |
| [Mao et al., 2023] | 2023 | KDD | DRL4Route: actor-critic tối ưu trực tiếp các thước đo không khả vi | Mức cải thiện nhỏ (khoảng 1–3%) |
| [Liu et al., 2025a] | 2025 | arXiv | MRGRP: đồ thị đa quan hệ với GraphFormer; dùng lộ trình dự đoán để giảm sai số ETA khoảng 13–16% MAE | Chỉ có giao đồ ăn; ít chi tiết thí nghiệm |
| [Wu et al., 2024b] | 2024 | arXiv (KDD 2024 cần kiểm) | LaDe: khoảng 10,7 triệu kiện hàng, 21 nghìn shipper, kèm benchmark | Chỉ logistics |
| [Wen et al., 2023] | 2023 | arXiv | Tổng quan và phân loại RTP, hệ thống hoá thước đo | Chỉ giao hàng |
| [Liu et al., 2023] | 2023 | The Innovation | Mô hình ngôn ngữ học thứ tự vùng, TSP sắp thứ tự trong vùng (dữ liệu Amazon) | Chi tiết chưa kiểm đầy đủ |
| [Gama & Fernandes, 2021] | 2021 | arXiv | Pointer Network huấn luyện bằng REINFORCE cho OPTW du lịch | Preprint; một tour; thời gian tĩnh |

### D. Gợi ý POI và tour cá nhân hoá

Có hai dòng ở đây:

- **Dòng tour** (nhóm của Lim) đưa sở thích và thời lượng tham quan học được từ ảnh Flickr vào OP. Gần mục tiêu của Journie nhất, nhưng chỉ cho một ngày và không có giờ mở cửa.
- **Dòng next-POI** (STAN, LSTPM, Flashback, GETNext) mạnh về học biểu diễn nhưng chỉ đưa ra một điểm kế tiếp, và cần lịch sử dày của từng người dùng. Du khách đến TP.HCM thường không có lịch sử như vậy.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Lim et al., 2015] | 2015 | IJCAI | PERSTOUR: OP với sở thích suy từ thời lượng ghé; thời lượng cá nhân hoá | Một ngày; không có giờ mở cửa và thời tiết |
| [Lim et al., 2018] | 2018 | KAIS | Mở rộng PERSTOUR: thêm độ mới của sở thích, cân bằng giữa độ phổ biến và sở thích; 10 thành phố | Đánh giá offline bằng hành trình ảnh |
| [Lim et al., 2016] | 2016 | ICAPS | Tour cho nhóm: phân cụm du khách và gán hướng dẫn viên | Chưa kiểm chi tiết |
| [Lim et al., 2019] | 2019 | KAIS | Tổng quan gợi ý tour từ dữ liệu mạng xã hội định vị (LBSN) | Trước giai đoạn Transformer và LLM |
| [Halder et al., 2024] | 2024 | Appl. Soft Comput. | Tổng quan lịch trình cá nhân hoá, từ tối ưu đến học sâu | Mới đọc phần tóm tắt |
| [Sun et al., 2020] | 2020 | AAAI | LSTPM: sở thích dài hạn và ngắn hạn | Chỉ một điểm kế tiếp |
| [Yang et al., 2020] | 2020 | IJCAI | Flashback: RNN quay lại các trạng thái ẩn trong quá khứ có bối cảnh tương tự | Cần lịch sử của người dùng |
| [Luo et al., 2021] | 2021 | WWW | STAN: self-attention không–thời gian hai lớp | Cần lịch sử dày |
| [Yang et al., 2022] | 2022 | SIGIR | GETNext: bản đồ dòng di chuyển chung, GCN và Transformer, đỡ được cold-start | Không ra cả lịch trình |
| [Gupta & Bedathur, 2022] | 2022 | ACM TIST | Axolotl: meta-learning, chuyển tri thức giữa các vùng thưa dữ liệu | Không có dữ liệu Đông Nam Á |
| [Wang et al., 2023] | 2023 | arXiv / ITT 2024 | Tổng quan các loại dữ liệu dùng trong gợi ý POI du lịch | Chỉ giai đoạn 2021–2023 |

### E. LLM kết hợp bộ lập kế hoạch

Kết luận chung của hướng này: LLM một mình lập lịch kém. Cụ thể, nó sai ràng buộc, đi xa và nhầm loại POI. Cách hiệu quả hơn là ghép LLM với bộ tối ưu hoặc bộ kiểm tra. Hầu hết đánh giá ở hướng này dựa trên benchmark tiếng Anh như TravelPlanner.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Kambhampati et al., 2024] | 2024 | ICML | LLM-Modulo: LLM sinh phương án, bộ kiểm tra bên ngoài xác minh và phản hồi | Bài quan điểm, ít thực nghiệm |
| [Gundawar et al., 2024] | 2024 | arXiv (workshop) | LLM-Modulo trên TravelPlanner | Chỉ chế độ tự lập kế hoạch |
| [Tang et al., 2024] | 2024 | EMNLP Industry | ITINERA: tách yêu cầu, chọn POI, tối ưu không gian có nhận biết cụm, rồi LLM viết lịch | Không học từ hành vi; không dự đoán giờ đến |
| [de la Rosa et al., 2024] | 2024 | arXiv | TRIP-PAL: LLM trích POI, planner đảm bảo ràng buộc | Thời lượng tham quan cho sẵn |
| [Choi et al., 2025] | 2025 | ICLR 2026 (theo danh sách) | ATLAS: đa tác tử, quản lý ràng buộc thay đổi trong hội thoại | Số liệu lấy từ tóm tắt |
| [Shen et al., 2025b] | 2025 | ACL Findings | TripTailor: benchmark lịch trình thật; lịch do LLM tạo có khoảng cách trung bình giữa các POI trên 17 km, so với 7,3 km ở lịch thật | Preprint/Findings; dữ liệu Trung Quốc |
| [Karmakar et al., 2025] | 2025 | arXiv (nơi đăng chưa xác nhận) | TripTide: benchmark lập lại kế hoạch khi có gián đoạn | LLM xử lý kém hơn khi lịch dài; phạm vi chưa kiểm |

### F. Dữ liệu POI, ngữ cảnh động và đánh giá

Hướng này mỏng nhất nhưng lại sát nhất với các vấn đề thực tế của Journie:

- Chất lượng dữ liệu POI, đặc biệt là giờ mở cửa và việc phát hiện địa điểm đã đóng cửa.
- Mức đông đúc và công bằng giữa các điểm.
- Cách đánh giá hệ thống.

Không có bài nào trong danh sách đánh giá độ chính xác của giờ mở cửa.

| Bài | Năm | Nơi đăng | Phương pháp | Hạn chế |
|---|---|---|---|---|
| [Yeow et al., 2021] | 2021 | ISPRS IJGI | So 9 phương pháp kiểm chứng POI trên OSM, Google, HERE và OneMap ở Singapore | Một khu vực; không tập trung vào thuộc tính như giờ mở cửa |
| [Zhang & Pfoser, 2019] | 2019 | PLOS ONE | Ghép OSM với Foursquare theo tên và khoảng cách; dùng lịch sử chỉnh sửa OSM | Một thành phố, một loại POI |
| [Wang & Laefer, 2025] | 2025 | Env. Plan. B | Dự đoán quán ăn đóng cửa ở NYC, F1 82,3% | Một ngành; bối cảnh COVID |
| [Liu et al., 2019; Liu et al., 2025b] | 2019/2025 | arXiv / J. Big Data | SCAIR: MDP có nhận biết đám đông, tối ưu tiện ích nhóm | Chỉ công viên giải trí |
| [Banerjee et al., 2023] | 2023 | Front. Big Data | Tổng quan 66 bài về công bằng đa bên trong gợi ý du lịch | Lập lịch hầu như chưa được xét |
| [Bellogín et al., 2025] | 2025 | arXiv (ACM TORS) | Phân tích các cạm bẫy trong nghiên cứu gợi ý POI: dataset, thiên lệch, đánh giá | Bài quan điểm |

---

## 3. Các khoảng trống nghiên cứu

**Bảng tổng hợp:**

| # | Khoảng trống | Hướng | Điểm yếu của Journie liên quan | Độ mạnh của bằng chứng | Khả thi trong 1 học kỳ |
|---|---|---|---|---|---|
| G1 | Thời gian di chuyển theo giờ cho thành phố xe máy | B | Thời gian di chuyển ước lượng thô | Trung bình | Trung bình |
| G2 | Lịch bền vững trước kẹt xe và mưa | B | Trễ, mưa, live mode chỉ phản ứng sau | Trung bình | Cao |
| G3 | Chất lượng lịch trong ngày: chờ, bữa ăn, nhịp độ | A | Chờ tới 6 giờ, ngày rỗng, không có bữa ăn | Mỏng | Rất cao |
| G4 | Lập lịch phân cấp "khu → POI" | A, C | Ngày rỗng, mở rộng lên 1.900 POI | Trung bình | Cao |
| G5 | Thời lượng tham quan học được, dự đoán đồng thời | C, D | Không có thời lượng học được | Trung bình | Trung bình / thấp |
| G6 | Học từ thao tác sửa lịch | C | Không học sở thích từ hành vi | Mỏng | Thấp (thiếu dữ liệu) |
| G7 | Cá nhân hoá cold-start cho du khách | D | Không học sở thích từ hành vi | Trung bình | Trung bình |
| G8 | Giờ mở cửa và đóng cửa bất định trong tối ưu | F | 1/3 giờ mở cửa không chắc, 28 điểm đóng cửa phát hiện muộn | Mỏng nhưng rõ | Cao |
| G9 | Lập lại kế hoạch mà vẫn giữ lịch ổn định | B, E | Live mode | Trung bình | Cao |
| G10 | Vòng kiểm chứng LLM ↔ solver, tiếng Việt | E | Đánh giá chỉ là kiểm ràng buộc | Trung bình | Cao |
| G11 | Thiếu bộ dữ liệu chuẩn và giao thức đánh giá | C, F | Đánh giá chỉ là kiểm ràng buộc | Trung bình | Cao |
| G12 | Đông đúc, nắng nóng, phân bổ khách | F | (chưa có trong hệ thống) | Mỏng | Trung bình |

---

### G1. Thời gian di chuyển phụ thuộc giờ cho thành phố xe máy

- **Mô tả.**
  - Mô hình OP có thời gian phụ thuộc giờ (TD-OP) đã có, nhưng hàm thời gian thường được coi là cho sẵn hoặc lấy từ lịch giao thông công cộng.
  - Các mô hình ETA học máy lại xây cho ô tô và taxi với GPS dày đặc.
  - Chưa thấy cầu nối giữa hai dòng này cho đô thị mà xe máy chiếm ưu thế.
- **Bằng chứng.**
  - [Gavalas et al., 2015] chỉ xét giao thông công cộng ở Athens.
  - [Verbeeck et al., 2017] giả định thời gian phụ thuộc giờ nhưng tất định và cho sẵn.
  - [Wang et al., 2018], [Fu et al., 2020] và [Hu et al., 2022] dùng dữ liệu taxi và ride-hailing quy mô lớn.
  - [Nguyen & Reinelt, 2017] là nguồn duy nhất trong danh sách về hàm thời gian cho giao thông xe máy, nhưng làm ở Hà Nội và ở mức vĩ mô.
  - Chính M2G4RTP chỉ dùng khoảng cách Euclid làm đặc trưng cạnh [Cai et al., 2023].
  - Không tìm thấy bài nào về ETA xe máy ở TP.HCM. Đây là kết quả của lần tìm kiếm này, chưa phải khẳng định rằng chưa ai làm.
- **Vì sao đúng với Journie.**
  - Thời gian di chuyển hiện là ước lượng thô: chưa dùng OSRM, chưa có dữ liệu giao thông thật.
  - TP.HCM kẹt xe giờ cao điểm và hay mưa chiều.
  - Sai số này lan sang mọi bước: giờ đến, thời gian chờ, và việc có kịp khung giờ mở cửa hay không.
  - Frontend tính lại giờ ngay trên thiết bị, nên mô hình thời gian phải nhẹ (xem ý chưng cất của [Fu et al., 2020]).
- **Hướng làm.**
  - Áp dụng kiểu "routing engine + hiệu chỉnh" như [Hu et al., 2022]:
    - Nền là thời gian từ OSRM tự host trên dữ liệu OSM Việt Nam, hoặc từ API ma trận (Vietmap/HERE).
    - Học hệ số hiệu chỉnh theo khung giờ, loại đường hoặc quận, và trạng thái mưa/khô.
  - Xuất ma trận thời gian cho khoảng 6 khung giờ, dùng cho cả `/routing/days` và `/routing`.
  - Bảo đảm tính FIFO: đi muộn hơn thì không được đến sớm hơn.
- **Dữ liệu cần có.**
  - Ma trận thời gian ở nhiều khung giờ. Với 900 POI có khoảng 810 nghìn cặp, nên giới hạn theo k láng giềng hoặc theo cụm để không vượt hạn mức API.
  - Từ 80 đến 150 chặng đi thực tế, ghi GPS bằng điện thoại, có ghi nhận mưa hay khô, làm ground truth.
  - Dữ liệu mưa theo giờ.
- **Đánh giá.**
  - Thước đo: MAE, MAPE, và tỉ lệ chặng sai dưới 5 phút (tương tự acc@20 của M2G4RTP nhưng với ngưỡng nhỏ hơn).
  - Baseline: haversine nhân vận tốc cố định (giống cách Distance-Greedy của M2G4RTP tính thời gian), OSRM khi đường thông thoáng, và API thô chưa hiệu chỉnh.
  - Đánh giá ở hạ nguồn: chạy lại lịch trình với thời gian "thật", đếm số lần lỡ khung giờ và tổng thời gian chờ.
- **Độ khó / khả thi.** Trung bình. Phần kỹ thuật làm được trong một học kỳ. Nút thắt là ground truth (phải tự đi đo) và điều khoản cùng hạn mức của API.

### G2. Lịch bền vững trước kẹt xe và mưa

- **Mô tả.** OP ngẫu nhiên và OP robust đã có, nhưng chưa thấy được đem vào lập lịch nhiều ngày trong đô thị có cú sốc thời tiết theo mùa. Các hệ thống đã triển khai vẫn dùng thời gian tĩnh.
- **Bằng chứng.**
  - [Varakantham et al., 2018]: OP nhạy rủi ro dùng SAA và MILP, kiểm trên công viên giải trí.
  - [Shang et al., 2017]: robust hai giai đoạn với tập bất định dạng hộp, ví dụ nhỏ, không nhiều ngày.
  - [Verbeeck et al., 2016]: TD-OPTW ngẫu nhiên (chưa đọc toàn văn).
  - [Vansteenwegen et al., 2011]: City Trip Planner dùng thời gian tĩnh.
  - [Campigotto et al., 2016] có xét thời tiết, nhưng cho lựa chọn phương tiện chứ không cho lập lịch nhiều điểm.
  - M2G4RTP chỉ có 58,62% dự đoán sai dưới 20 phút [Cai et al., 2023]. Nghĩa là một con số dự đoán duy nhất không đủ; cần lập lịch dựa trên phân phối.
  - [Shen et al., 2025a] nêu tính bền vững trước bất định là thách thức còn mở (mức tóm tắt).
- **Vì sao đúng với Journie.**
  - Mùa mưa ở TP.HCM có mưa rào buổi chiều.
  - Live mode chỉ lập lại kế hoạch sau khi bị trễ hoặc gặp mưa; lịch ban đầu không có đệm thời gian.
- **Hướng làm.** So sánh ba cách:
  - (a) Đệm theo phân vị: dùng phân vị q (ví dụ 80%) của thời gian chặng lấy từ G1.
  - (b) Ràng buộc cơ hội: xác suất đến trước giờ đóng cửa ≥ 1 − α, xấp xỉ bằng SAA như [Varakantham et al., 2018].
  - (c) Robust dạng hộp như [Shang et al., 2017], dùng khi không có phân phối đáng tin.
- **Dữ liệu cần có.**
  - Phân phối thời gian chặng, lấy từ G1. Nếu thiếu, giả định phân phối log-normal và hiệu chỉnh bằng số đo ít ỏi đã có, rồi nói rõ hạn chế này.
  - Xác suất mưa theo giờ và theo tháng.
- **Đánh giá.**
  - Mô phỏng Monte Carlo khoảng 1.000 kịch bản cho mỗi lịch.
  - Thước đo: tỉ lệ lịch có ít nhất một điểm bị lỡ khung giờ, độ trễ kỳ vọng, lợi ích thực nhận, và tổng thời gian chờ. Cần xem cùng G3, vì đệm lớn sẽ làm thời gian chờ tăng.
  - Baseline: mô hình tất định hiện tại, và đệm cố định 20%.
- **Độ khó / khả thi.** Trung bình. Khả thi cao nếu chấp nhận phân phối giả định và nói rõ giới hạn.

### G3. Chất lượng lịch trong ngày: chờ, bữa ăn, nhịp độ, ngày rỗng

- **Mô tả.**
  - Mục tiêu chuẩn của TOPTW là tối đa tổng lợi ích. Đến sớm thì chờ đến giờ mở cửa, và thời gian chờ không bị phạt.
  - Bữa ăn đúng giờ, số điểm tối đa mỗi ngày và độ đều tải giữa các ngày ít khi được đưa thành mục tiêu hay ràng buộc rõ ràng.
- **Bằng chứng.**
  - [Vansteenwegen et al., 2009] dùng TOPTW với mục tiêu lợi ích.
  - [Vansteenwegen et al., 2011] là một trong số ít bài có giờ nghỉ trưa.
  - [Divsalar et al., 2013] và [Wu et al., 2024a] xử lý nhiều ngày qua việc chọn khách sạn, chứ không qua cân bằng tải giữa các ngày.
  - **Bằng chứng mỏng:** hai tổng quan [Gunawan et al., 2016; Ruiz-Meza & Montoya-Torres, 2022] mới được kiểm ở mức tóm tắt, nên chưa thể nói "chưa ai làm". Cần đọc toàn văn hai bài này trước khi viết phần này trong luận văn.
- **Vì sao đúng với Journie.** Thời gian chờ có lúc tới 6 giờ; chuyến dài có ngày rỗng; không có cấu trúc bữa ăn; không giới hạn số điểm mỗi ngày; có lỗi giữa khung giờ đơn và giờ mở cửa tách ca (ví dụ 7:00–11:00 và 13:30–17:00).
- **Hướng làm.** Xây TOPTW đa mục tiêu trong CP-SAT gồm:
  1. Phạt thời gian chờ, hoặc chèn một điểm gần đó vào khoảng trống.
  2. Nút bữa ăn bắt buộc với khung giờ mềm (trưa 11:00–13:30, tối 18:00–20:30), chọn từ các nhà hàng gần lộ trình.
  3. Giới hạn số điểm mỗi ngày theo nhịp độ chuyến đi.
  4. Phạt khi các ngày lệch tải nhau, và đòi hỏi mỗi ngày có ít nhất một điểm chính.
  5. Hỗ trợ nhiều khung giờ mở cửa trong một ngày (multiple time windows).
- **Dữ liệu cần có.** Dữ liệu POI hiện có, nhãn loại bữa ăn, và một bộ yêu cầu mẫu.
- **Đánh giá.**
  - Thước đo: tổng thời gian chờ, thời gian chờ dài nhất, số ngày rỗng, độ lệch chuẩn của số giờ hoạt động mỗi ngày, tỉ lệ ngày có bữa ăn nằm trong khung, tổng lợi ích, thời gian giải.
  - Baseline: mô hình hiện tại và ILS [Vansteenwegen et al., 2009].
  - Thêm: người dùng so sánh từng cặp lịch A/B.
- **Độ khó / khả thi.** Thấp đến trung bình; rất khả thi. Đứng riêng thì đóng góp khoa học hơi mỏng, nên ghép với G1 hoặc G2.

### G4. Lập lịch nhiều ngày phân cấp "khu → POI"

- **Mô tả.**
  - M2G4RTP cho thấy hành vi di chuyển có hai tầng: ít chuyển giữa các khu, nhiều chuyển trong một khu. Mô hình hoá tầng khu giúp dự đoán tốt hơn.
  - Bên du lịch, phân cụm đã được dùng làm heuristic. Nhưng chưa thấy mô hình nhiều ngày dùng tầng khu có ý nghĩa thực (quận, khu phố) cùng với tri thức về cách chuyển giữa các khu.
- **Bằng chứng.**
  - [Cai et al., 2023]: 50,97 lần chuyển giữa địa điểm so với 6,20 lần giữa AOI; bỏ tầng AOI làm dự đoán thứ tự giảm rõ nhất.
  - [Liu et al., 2023]: học thứ tự giữa các vùng, rồi TSP trong từng vùng.
  - [Gavalas et al., 2015]: heuristic theo cụm.
  - [Tang et al., 2024]: tối ưu không gian có nhận biết cụm.
  - [Divsalar et al., 2013]: OPHS, mỗi ngày có điểm đầu và điểm cuối.
  - **Bằng chứng mỏng:** chưa có dữ liệu cho thấy du khách ở TP.HCM cũng "xong khu này rồi mới sang khu khác". Đây là giả thuyết cần kiểm.
- **Vì sao đúng với Journie.**
  - `/routing/days` vốn đã là hai tầng (chia ngày, rồi sắp thứ tự), nhưng việc chia ngày không dựa vào khu vực.
  - Có ngày rỗng ở chuyến dài.
  - Khi mở rộng từ khoảng 900 lên 1.900 POI, CP-SAT giải trên toàn bộ tập sẽ chậm hơn.
- **Hướng làm.**
  - Tầng 1: gán khu cho từng ngày. Đây là một OP nhỏ trên đồ thị khu: lợi ích của khu là tổng lợi ích các ứng viên trong khu, chi phí là thời gian di chuyển giữa tâm các khu, khách sạn làm điểm đầu và cuối như OPHS.
  - Tầng 2: giải TOPTW trong ngày, chỉ trên POI của 1–2 khu đã gán.
  - Tuỳ chọn có học máy: ước lượng xác suất chuyển giữa các khu từ log sửa lịch (G6) và dùng làm prior.
- **Dữ liệu cần có.** Ranh giới quận/phường từ OSM, hoặc cụm theo mật độ (ví dụ HDBSCAN); ma trận thời gian từ G1.
- **Đánh giá.**
  - Thước đo: thời gian giải theo quy mô (900 rồi 1.900 POI), mức hụt lợi ích so với CP-SAT giải toàn bộ, số lần đổi khu mỗi ngày, tổng thời gian di chuyển, số ngày rỗng.
  - Baseline: CP-SAT giải toàn bộ như hiện tại, phân cụm k-means đơn giản, và ILS.
- **Độ khó / khả thi.** Trung bình. Khả thi cao, vì phiên bản không học máy không cần dữ liệu hành vi.

### G5. Thời lượng tham quan học được và dự đoán đồng thời thứ tự–thời gian

- **Mô tả.** Lập lịch cần biết thời lượng ở mỗi POI, nhưng thường dùng giá trị cố định. Chưa thấy mô hình nào cho du khách dự đoán cùng lúc thứ tự, giờ đến và thời lượng như M2G4RTP làm cho shipper.
- **Bằng chứng.**
  - [Lim et al., 2015; Lim et al., 2018] học thời lượng cá nhân hoá từ ảnh Flickr, nhưng chỉ cho một ngày và không có giờ mở cửa.
  - [Cai et al., 2023] cho thấy học đồng thời tốt hơn hai bước; [Gao et al., 2021] với cách hai bước thì kém.
  - [Liu et al., 2025a] dùng lộ trình dự đoán để giảm sai số ETA.
  - [Wang et al., 2018] học đa nhiệm cho thời gian di chuyển.
  - [de la Rosa et al., 2024] dùng thời lượng cho sẵn.
- **Vì sao đúng với Journie.** Chưa có thời lượng học được. Sai số thời lượng cộng dồn lại thành lỡ khung giờ hoặc chờ lâu.
- **Hướng làm.**
  - Bước 1 (khả thi): ước lượng thời lượng theo loại POI, quy mô và giờ trong ngày, bằng cách lấy khoảng cách giữa các ảnh liên tiếp như PERSTOUR. Hiệu chỉnh thêm bằng dữ liệu live mode nếu có ghi lại giờ đến và giờ rời thật.
  - Bước 2 (khi đã có dữ liệu): một mô hình đa nhiệm nhỏ dự đoán cùng lúc thứ tự và thời lượng/giờ đến, với trọng số loss theo bất định như M2G4RTP.
  - Đầu ra nên là phân phối, để G2 dùng được.
- **Dữ liệu cần có.** Ảnh geotag công khai ở TP.HCM (mật độ chưa kiểm, đây là rủi ro), log live mode, và khảo sát.
- **Đánh giá.**
  - Thước đo: MAE của thời lượng (phút), tỉ lệ vi phạm khung giờ khi chạy lại lịch.
  - Baseline: hằng số theo loại POI, và trung vị theo loại POI.
- **Độ khó / khả thi.** Bước 1 ở mức trung bình. Bước 2 khó làm trong một học kỳ vì thiếu dữ liệu.

### G6. Học từ thao tác sửa lịch: "dự đoán lộ trình" của du khách

- **Mô tả.** Kết luận quan trọng nhất của dòng RTP là lộ trình tối ưu khác lộ trình người thật chọn. Bên du lịch, hệ thống gần như không đo việc người dùng sửa lịch ra sao, và không học lại từ đó.
- **Bằng chứng.**
  - OR-Tools đạt HR@3 62,18 so với 72,21 của mô hình học [Cai et al., 2023].
  - OSquare phát hiện khoảng cách cảm nhận là yếu tố chính [Zhang et al., 2019].
  - [Mao et al., 2023] tối ưu trực tiếp các thước đo về thứ tự.
  - Tất cả các bài trên là cho shipper, với dữ liệu hàng triệu bản ghi [Wu et al., 2024b].
  - [Tang et al., 2024] sắp thứ tự bằng tối ưu.
  - [Lim et al., 2018] so với hành trình ảnh trong quá khứ chứ không dùng phản hồi sửa lịch.
  - **Bằng chứng mỏng:** chưa thấy bài nào dùng thao tác khoá, đổi thứ tự hay xoá làm tín hiệu học, nhưng phạm vi tìm kiếm có hạn.
- **Vì sao đúng với Journie.** Frontend đã có khoá, sắp lại, thêm, xoá và tính lại giờ. Đây là nguồn tín hiệu ngầm hiếm có, nhưng hiện chưa được dùng.
- **Hướng làm.**
  1. Ghi log các thao tác sửa, ẩn danh và có sự đồng ý của người dùng.
  2. Đo khoảng cách giữa thứ tự của solver và thứ tự cuối cùng bằng KRC, LSD và HR@k.
  3. Huấn luyện một mô hình xếp hạng nhỏ kiểu OSquare để dự đoán điểm kế tiếp.
  4. Dùng kết quả đó làm chi phí mềm về độ "tự nhiên" trong solver.
- **Dữ liệu cần có.** Cần người dùng thật. Trong một học kỳ chỉ có thể có vài chục người, nên làm dưới dạng pilot có kịch bản.
- **Đánh giá.**
  - Thước đo: KRC, LSD và HR@3 giữa lịch đề xuất và lịch cuối; số thao tác sửa trung bình mỗi lịch.
  - Baseline: Distance-Greedy, Time-Greedy, và thứ tự của solver hiện tại. Đây đúng là bộ baseline không dùng học máy của M2G4RTP.
- **Độ khó / khả thi.** Khó về dữ liệu. Làm được dưới dạng khung thu thập cộng phân tích, chưa làm được dưới dạng mô hình sâu.

### G7. Cá nhân hoá cold-start cho du khách đi một lần

- **Mô tả.** Mô hình next-POI mạnh nhưng cần lịch sử dày của từng người. Du khách thường không có check-in tại TP.HCM. Thêm nữa, next-POI chỉ đưa ra một điểm, không ra được cả lịch khả thi.
- **Bằng chứng.**
  - [Luo et al., 2021; Yang et al., 2020; Sun et al., 2020] dựa vào lịch sử người dùng.
  - [Yang et al., 2022] đỡ cold-start bằng bản đồ dòng di chuyển chung.
  - [Gupta & Bedathur, 2022] chuyển tri thức giữa các vùng nhưng không có dữ liệu Đông Nam Á.
  - [Ataei et al., 2024] đặt trọng số theo phân khúc du khách.
  - [Wen et al., 2022b] dùng embedding cá nhân cho shipper.
  - [Wang et al., 2023] cho thấy nghiên cứu hiện dùng ít loại dữ liệu.
  - [Bellogín et al., 2025] chỉ ra thiên lệch về độ phổ biến.
- **Vì sao đúng với Journie.** LLM trích sở thích ban đầu từ yêu cầu, nhưng sau đó không cập nhật theo hành vi.
- **Hướng làm.**
  - Lợi ích của POI bằng prior theo phân khúc (lấy từ yêu cầu) cộng với cập nhật Bayes từ phản hồi ngầm: xoá là tín hiệu âm, khoá hoặc thêm là tín hiệu dương. Tinh thần giống cách cập nhật hồ sơ trong [Campigotto et al., 2016].
  - Tuỳ chọn: thêm điểm thưởng cho các cặp POI hay được ghé cùng nhau, theo ý của GETNext.
- **Dữ liệu cần có.** Nhãn chủ đề của POI (đã có từ khâu biên tập) và log phiên dùng.
- **Đánh giá.**
  - Mô phỏng các persona tổng hợp có sở thích ẩn.
  - Thước đo: NDCG@k của tập POI được chọn, số vòng sửa cho đến khi ổn định.
  - Baseline: không cập nhật; gợi ý theo độ phổ biến.
  - Lưu ý: kết luận rút ra từ persona tổng hợp chỉ có giá trị tương đối.
- **Độ khó / khả thi.** Trung bình.

### G8. Giờ mở cửa và trạng thái đóng cửa bất định nhưng chưa được đưa vào tối ưu

- **Mô tả.** Mô hình lập lịch coi giờ mở cửa và việc POI còn hoạt động là chắc chắn. Nghiên cứu về chất lượng POI tập trung vào vị trí và độ đầy đủ. Giờ mở cửa hầu như chưa được đánh giá, và dự đoán đóng cửa chỉ có ở ngoài lĩnh vực du lịch.
- **Bằng chứng.**
  - [Yeow et al., 2021]: vị trí sai dưới 60 m nhưng thiếu và thừa POI nhiều; thuộc tính không phải trọng tâm.
  - [Zhang & Pfoser, 2019]: ghép nguồn theo tên và khoảng cách; dùng lịch sử chỉnh sửa OSM làm tín hiệu về độ mới.
  - [Wang & Laefer, 2025]: dự đoán đóng cửa, F1 82,3%, chỉ ở NYC.
  - Không tìm thấy nghiên cứu bình duyệt nào về độ chính xác của giờ mở cửa. Đây vừa là khoảng trống, vừa là điểm yếu về bằng chứng.
- **Vì sao đúng với Journie.** Khoảng 1/3 giờ mở cửa bị gắn cờ không chắc; 220 trong 757 điểm lệch với nguồn tham chiếu; 28 điểm đã đóng cửa chỉ phát hiện muộn; có lỗi giữa khung giờ đơn và giờ tách ca.
- **Hướng làm.**
  1. Hợp nhất giờ mở cửa từ nhiều nguồn, có trọng số theo độ tin cậy của từng nguồn (truth discovery, ví dụ ước lượng độ tin cậy bằng EM).
  2. Tính điểm rủi ro đóng cửa từ các đặc trưng: số nguồn còn liệt kê, ngày sửa gần nhất trên OSM, mức bất đồng giữa các nguồn, loại hình.
  3. Đưa vào solver: lên lịch POI kém tin cậy xa mép khung giờ, giảm lợi ích theo rủi ro, hoặc gắn nhãn "nên kiểm tra trước". Nối sang G9 để xử lý khi phát hiện đóng cửa trong lúc đang đi.
- **Dữ liệu cần có.**
  - Các nguồn đã gộp: OSM, Overture, Vietmap, HERE và nguồn biên tập.
  - Một mẫu kiểm chứng thủ công khoảng 100–150 POI.
  - 28 ca đóng cửa đã biết làm nhãn dương. Số này rất ít và cần nói rõ trong luận văn.
- **Đánh giá.**
  - Độ chính xác giờ mở cửa của bản hợp nhất so với từng nguồn riêng: đúng hoàn toàn, và sai không quá 30 phút.
  - Precision và recall@k của điểm rủi ro đóng cửa.
  - Số lần "đến nơi thì đóng cửa" trong mô phỏng.
  - Baseline: thứ tự ưu tiên nguồn cố định, và bỏ phiếu đa số.
- **Độ khó / khả thi.** Trung bình; khả thi cao. Đóng góp mang tính địa phương rõ ràng.

### G9. Lập lại kế hoạch khi có gián đoạn mà vẫn giữ lịch ổn định

- **Mô tả.** OP thời gian thực tập trung vào tốc độ giải. Các benchmark cho LLM đo việc "giữ ý định ban đầu" bằng giám khảo là LLM. Còn thiếu cách đo và kiểm soát mức thay đổi của lịch khi solver lập lại kế hoạch.
- **Bằng chứng.**
  - [Verbeeck et al., 2017]: giải trong vài giây, nhưng một tour và tất định.
  - [Karmakar et al., 2025]: LLM xử lý gián đoạn kém hơn khi lịch dài (nơi đăng chưa xác nhận).
  - [Choi et al., 2025]: ràng buộc thay đổi theo hội thoại.
  - [Wen et al., 2022a]: mã hoá lại các điểm còn lại sau mỗi bước.
  - M2G4RTP là mô hình tĩnh, không lập lại kế hoạch.
- **Vì sao đúng với Journie.** Live mode lập lại kế hoạch khi trễ hoặc mưa, và người dùng có thể khoá điểm.
- **Hướng làm.**
  - Tối ưu lại với một số hạng ổn định: phạt việc đổi thứ tự và bỏ điểm đã hứa; giữ cứng các điểm đã khoá và các điểm trong 1–2 giờ tới.
  - Đo độ ổn định bằng KRC và LSD giữa lịch cũ và lịch mới, mượn trực tiếp từ M2G4RTP.
  - Bộ kịch bản: mưa từ 14 đến 17 giờ, trễ 30–60 phút, POI đóng cửa đột xuất, người dùng muốn về sớm.
- **Dữ liệu cần có.** Tổng hợp từ các lịch đã sinh cộng với kịch bản. Không cần dữ liệu ngoài.
- **Đánh giá.**
  - Thước đo: lợi ích giữ lại được, KRC/LSD so với lịch cũ, số điểm bị bỏ, số vi phạm ràng buộc, độ trễ tính toán.
  - Baseline: giải lại từ đầu không có số hạng ổn định; xoá điểm theo kiểu tham lam; tuỳ chọn thêm LLM sửa lịch trực tiếp.
- **Độ khó / khả thi.** Thấp đến trung bình; khả thi cao.

### G10. Vòng kiểm chứng LLM ↔ solver cho yêu cầu tiếng Việt

- **Mô tả.** Cách ghép LLM với bộ lập kế hoạch đã có, nhưng thường chỉ đi một chiều từ LLM sang solver, và được đánh giá bằng tiếng Anh. Lỗi trích ràng buộc ít khi được đo riêng.
- **Bằng chứng.**
  - [Kambhampati et al., 2024] và [Gundawar et al., 2024]: LLM-Modulo, có bộ kiểm tra và vòng phản hồi.
  - [de la Rosa et al., 2024] và [Tang et al., 2024]: LLM kết hợp bộ tối ưu.
  - [Shen et al., 2025b]: lịch do LLM tạo có khoảng cách trung bình giữa các POI trên 17 km so với 7,3 km ở lịch thật, và có nhầm loại POI.
  - [Choi et al., 2025]: ràng buộc thay đổi theo hội thoại.
  - Không bài nào trong danh sách xét tiếng Việt.
- **Vì sao đúng với Journie.**
  - LLM trích các ràng buộc: điểm đến, ngày, ngân sách, sở thích, điểm phải đến, điểm cần tránh, giờ trong ngày.
  - Đánh giá hiện chỉ là kiểm ràng buộc.
  - Khi solver không tìm được lời giải (ví dụ quá nhiều điểm bắt buộc), chưa có vòng phản hồi.
- **Hướng làm.**
  1. Xây 200–300 yêu cầu bằng tiếng Việt và tiếng Anh, có trộn ngôn ngữ và viết tắt, kèm nhãn ràng buộc chuẩn.
  2. Đo F1 cho từng trường.
  3. Xây bộ kiểm tra xác định: khả thi về thời gian, ngân sách, giờ mở cửa, mâu thuẫn giữa điểm phải đến và điểm cần tránh. Kết quả kiểm tra được phản hồi có cấu trúc để LLM sửa, hoặc để hỏi lại người dùng.
  4. So sánh với cách để LLM tự lập lịch.
- **Đánh giá.**
  - Thước đo: F1 trích xuất, tỉ lệ lịch thoả mọi ràng buộc cứng, số vòng lặp, độ trễ và chi phí, khoảng cách trung bình giữa các POI liên tiếp (theo cách của TripTailor).
  - Baseline: trích một lượt như hiện tại; LLM tự lập lịch.
- **Độ khó / khả thi.** Thấp đến trung bình; khả thi cao. Tính mới phụ thuộc vào bộ dữ liệu tiếng Việt và phần phân tích lỗi.

### G11. Thiếu bộ dữ liệu chuẩn và giao thức đánh giá cho lập lịch đô thị nhiều ngày

- **Mô tả.** Dòng logistics tiến nhanh nhờ có dữ liệu mở và thước đo chung. Lập lịch du lịch lại được đánh giá rời rạc: lúc dùng benchmark OP tổng hợp, lúc dùng F1 so với hành trình ảnh, lúc khảo sát người dùng, lúc dùng LLM làm giám khảo.
- **Bằng chứng.**
  - Bên logistics: [Wu et al., 2024b] (dữ liệu LaDe) và [Wen et al., 2023] (hệ thống hoá thước đo).
  - Bên du lịch:
    - [Bellogín et al., 2025]: đánh giá offline không phản ánh giá trị thật.
    - [Halder et al., 2024]: tổng hợp các cách đánh giá.
    - [Lim et al., 2018]: F1 so với hành trình trong quá khứ.
    - [Vansteenwegen et al., 2011]: thống kê sử dụng và phản hồi người dùng.
    - [Shen et al., 2025b]: đo tính khả thi, tính hợp lý và mức cá nhân hoá.
    - [Banerjee et al., 2023]: đa số nghiên cứu đánh giá offline.
- **Vì sao đúng với Journie.** Hiện chỉ kiểm ràng buộc, và chưa có một bộ bài toán cố định để so sánh các phiên bản solver với nhau.
- **Hướng làm.**
  - Xây "bộ bài toán TP.HCM" gồm: các yêu cầu đã chuẩn hoá, tập POI có giờ mở cửa, và ma trận thời gian theo giờ.
  - Bộ thước đo 5 nhóm:
    - Khả thi: số vi phạm.
    - Hiệu quả: tỉ lệ thời gian di chuyển, thời gian chờ.
    - Độ phủ: điểm phải đến, mức khớp sở thích.
    - Cân bằng: số ngày rỗng, độ lệch tải giữa các ngày.
    - Bền vững: kết quả mô phỏng của G2.
  - Bổ sung đánh giá A/B với người dùng.
- **Dữ liệu cần có.** Phần lớn đã có. Dữ liệu từ nguồn thương mại có thể không được công bố lại, nên chỉ công bố phần lấy từ OSM và Overture.
- **Độ khó / khả thi.** Thấp đến trung bình; khả thi cao. Nên là phần bắt buộc của mọi đề tài.

### G12. Đông đúc, nắng nóng và phân bổ khách (bằng chứng mỏng, ưu tiên thấp)

- **Mô tả.** Lợi ích của POI thường không đổi theo giờ, trong khi mức đông đúc và nắng gắt buổi trưa ảnh hưởng tới trải nghiệm. Công bằng giữa các điểm hầu như chưa được xét trong lập lịch.
- **Bằng chứng.**
  - [Liu et al., 2019; Liu et al., 2025b]: SCAIR, nhưng chỉ cho công viên giải trí.
  - [Banerjee et al., 2023]: công bằng xã hội trong lập lịch hầu như chưa được nghiên cứu.
  - [Bellogín et al., 2025]: thiên lệch về độ phổ biến.
  - Không có bài nào cho đô thị Đông Nam Á.
- **Vì sao đúng với Journie.** Nguồn biên tập như Michelin và báo chí có thể khiến đề xuất dồn vào cùng một nhóm điểm. Các điểm ngoài trời có thể bị xếp vào giữa trưa.
- **Hướng làm.**
  - Lợi ích phụ thuộc giờ: điểm ngoài trời giảm lợi ích trong khoảng 11–15 giờ và khi mưa.
  - Thêm số hạng đa dạng cho các điểm ít được đề xuất.
  - Đo mức tập trung bằng hệ số Gini của số lần được đề xuất.
- **Độ khó / khả thi.** Trung bình. Gần như không có dữ liệu về đám đông, nên chỉ hợp làm phần mở rộng.

---

## 4. Đề xuất đề tài (xếp hạng)

### Hạng 1. Lập lịch du lịch nhiều ngày với thời gian di chuyển theo giờ và bền vững trước bất định tại TP.HCM (G1 + G2 + G3, đánh giá theo G11)

**Lý do xếp đầu:**

- Sửa trực tiếp các điểm yếu lớn nhất: thời gian thô, chờ tới 6 giờ, ngày rỗng, không có bữa ăn.
- Có nền tài liệu vững: TD-OP [Verbeeck et al., 2017], OP nhạy rủi ro [Varakantham et al., 2018], TOPTW [Vansteenwegen et al., 2009].
- Khoảng trống rõ: chưa có ở bối cảnh đô thị xe máy.
- Không phụ thuộc vào dữ liệu người dùng.

**Câu hỏi nghiên cứu:**

- RQ1: ma trận thời gian đã hiệu chỉnh theo giờ giảm sai số bao nhiêu so với ước lượng thô?
- RQ2: đệm theo phân vị hoặc ràng buộc cơ hội giảm vi phạm khung giờ bao nhiêu, và phải đánh đổi bao nhiêu lợi ích và thời gian chờ?
- RQ3: phạt thời gian chờ, nút bữa ăn và giới hạn số điểm mỗi ngày thay đổi chất lượng lịch ra sao?

**Kế hoạch thí nghiệm:**

- **Tuần 1–2.** Đọc toàn văn [Gavalas et al., 2015; Verbeeck et al., 2016; Varakantham et al., 2018] và hai tổng quan ở hướng A. Chốt bộ thước đo của G11.
- **Tuần 3–5.**
  - Dựng OSRM, lấy ma trận cho khoảng 300 POI ở 6 khung giờ.
  - Đo 80–150 chặng thực tế.
  - Khớp hệ số hiệu chỉnh.
- **Tuần 6–9.** Cài các biến thể:
  - V0: mô hình hiện tại.
  - V1: V0 + thời gian phụ thuộc giờ.
  - V2: V1 + đệm theo phân vị.
  - V3: V1 + ràng buộc cơ hội giải bằng SAA.
  - V4: V2 hoặc V3 + phạt chờ, bữa ăn và giới hạn số điểm.
- **Tuần 10–12.**
  - Chạy 60 bài toán (2–5 ngày, 3 mức nhịp độ, mùa mưa và mùa khô) cho 5 biến thể.
  - Mô phỏng Monte Carlo.
  - Kiểm định thống kê theo cặp (Wilcoxon).
- **Tuần 13–15.** So sánh A/B với 10–20 người dùng, rồi viết luận văn.

**Rủi ro:** hạn mức API, và số chặng đo thực tế ít. Cách xử lý: báo cáo khoảng tin cậy, và giữ OSRM làm nguồn dự phòng.

### Hạng 2. Lập lịch phân cấp "khu → POI" lấy cảm hứng từ M2G4RTP, kèm đo độ "tự nhiên" của lộ trình (G4 + G5 bước 1 + G6 phần đo)

**Lý do:**

- Gắn trực tiếp với bài đã đọc.
- Giải quyết việc mở rộng lên 1.900 POI và ngày rỗng.
- Phần học máy chỉ là tuỳ chọn.

Điểm trừ: giả thuyết "du khách cũng đi theo khu" chưa có bằng chứng.

**Câu hỏi nghiên cứu:**

- Lập lịch phân cấp có giữ được mức hụt lợi ích nhỏ trong khi giảm thời gian giải ở quy mô 1.900 POI không?
- Lịch phân cấp có ít đổi khu hơn và bị người dùng sửa ít hơn không?

**Kế hoạch thí nghiệm:**

- **Tuần 1–3.** Định nghĩa khu theo hai cách (quận/phường và HDBSCAN), thống kê các khu, dựng baseline giải toàn bộ.
- **Tuần 4–8.** Cài tầng 1 (OP trên đồ thị khu, có khách sạn) và tầng 2 (TOPTW). So sánh ở 900 và 1.900 POI.
- **Tuần 6–10 (song song).**
  - Pilot với 20–30 người để thu log sửa lịch.
  - Ước lượng prior về thời lượng từ ảnh geotag.
- **Tuần 11–13.**
  - Đo KRC, LSD và HR@3 giữa lịch đề xuất và lịch đã sửa, cùng số thao tác sửa.
  - Baseline: Distance-Greedy, Time-Greedy và solver hiện tại.
  - Tuỳ chọn: mô hình xếp hạng kiểu OSquare.
- **Tuần 14–15.** Viết luận văn.

### Hạng 3. Vòng kiểm chứng LLM–solver cho yêu cầu tiếng Việt, kèm lập lại kế hoạch ổn định (G10 + G9)

**Lý do:** dễ làm và có sản phẩm cụ thể là bộ dữ liệu tiếng Việt. Tuy vậy tính mới phụ thuộc vào chất lượng nhãn và phần phân tích lỗi. Mức cải thiện của vòng kiểm chứng có thể nhỏ khi dùng LLM mạnh.

**Kế hoạch thí nghiệm:**

- **Tuần 1–4.** Thu thập và gán nhãn 200–300 yêu cầu. Hai người gán nhãn độc lập và đo mức đồng thuận.
- **Tuần 5–8.**
  - Xây bộ kiểm tra và vòng phản hồi.
  - Thêm số hạng ổn định cho live mode.
- **Tuần 9–12.**
  - So sánh ba cách: trích một lượt, có vòng kiểm chứng, và LLM tự lập lịch.
  - Chạy các kịch bản gián đoạn và đo bằng KRC/LSD.
- **Tuần 13–15.** Phân tích lỗi và viết luận văn.

**Phương án thay thế:** nếu luận văn nghiêng về dữ liệu hơn là định tuyến, G8 là ứng viên tốt với đóng góp địa phương rõ. Nên ghép G8 với phần rủi ro của G2.

---

## 5. Tài liệu tham khảo

*Chỉ gồm các bài đã kiểm. Các ghi chú "cần kiểm" phải được xử lý trước khi nộp luận văn.*

1. Ataei, M., Divsalar, A., Saberi, M. (2024). The bi-objective orienteering problem with hotel selection: an integrated text mining optimisation approach. *Information Technology and Management* 25(3), 247–275. https://ideas.repec.org/a/spr/infotm/v25y2024i3d10.1007_s10799-022-00377-5.html
2. Banerjee, A., Banik, P., Wörndl, W. (2023). A review on individual and multistakeholder fairness in tourism recommender systems. *Frontiers in Big Data* 6:1168692. https://pmc.ncbi.nlm.nih.gov/articles/PMC10206003/
3. Bellogín, A., Dietz, L. W., Ricci, F., Sánchez, P. (2025). Point of Interest Recommendation: Pitfalls and Viable Solutions. arXiv:2507.13725 (được liệt kê cho ACM TORS 2026). https://arxiv.org/abs/2507.13725
4. Cai, T., Wan, H., Wu, F., Wen, H., Guo, S., Wu, L., Hu, H., Lin, Y. (2023). M2G4RTP: A Multi-Level and Multi-Task Graph Model for Instant-Logistics Route and Time Joint Prediction. *IEEE ICDE 2023*, 3296–3308. DOI 10.1109/ICDE55515.2023.00253. https://dblp.uni-trier.de/rec/conf/icde/CaiWWW0WHL23.html
5. Campigotto, P., Rudloff, C., Leodolter, M., Bauer, D. (2016). Personalized and situation-aware multimodal route recommendations: the FAVOUR algorithm. arXiv:1602.09076 (bản IEEE T-ITS: DOI 10.1109/TITS.2016.2565643). https://arxiv.org/abs/1602.09076
6. Choi, J., Yoon, J., Chen, J., Jha, S., Pfister, T. (2025). ATLAS: Constraints-Aware Multi-Agent Collaboration for Real-World Travel Planning. ICLR 2026, arXiv:2509.25586. https://arxiv.org/abs/2509.25586
7. de la Rosa, T., Gopalakrishnan, S., Pozanco, A., Zeng, Z., Borrajo, D. (2024). TRIP-PAL: Travel Planning with Guarantees by Combining Large Language Models and Automated Planners. arXiv:2406.10196. https://arxiv.org/abs/2406.10196
8. Divsalar, A., Vansteenwegen, P., Cattrysse, D. (2013). A variable neighborhood search method for the orienteering problem with hotel selection. *International Journal of Production Economics* 145(1), 150–160. https://doi.org/10.1016/j.ijpe.2013.01.010 *(DOI được suy theo mẫu của Elsevier, cần kiểm.)*
9. Fu, K., Meng, F., Ye, J., Wang, Z. (2020). CompactETA: A Fast Inference System for Travel Time Prediction. *KDD 2020*, 3337–3345. https://www.aminer.org/pub/5f03f3b611dc83056223208a/compacteta-a-fast-inference-system-for-travel-time-prediction
10. Gama, R., Fernandes, H. L. (2021). A Reinforcement Learning Approach to the Orienteering Problem with Time Windows. arXiv:2011.03647 (nộp 11/2020, sửa 6/2021). https://arxiv.org/abs/2011.03647
11. Gao, C., Zhang, F., Wu, G., Hu, Q., Ru, Q., Hao, J., He, R., Sun, Z. (2021). A Deep Learning Method for Route and Time Prediction in Food Delivery Service. *KDD 2021*, 2879–2889. https://doi.org/10.1145/3447548.3467068
12. Gavalas, D., Konstantopoulos, C., Mastakas, K., Pantziou, G. (2014). A survey on algorithmic approaches for solving tourist trip design problems. *Journal of Heuristics* 20(3), 291–328. https://doi.org/10.1007/s10732-014-9242-5
13. Gavalas, D., Konstantopoulos, C., Mastakas, K., Pantziou, G., Vathis, N. (2015). Heuristics for the time dependent team orienteering problem: Application to tourist route planning. *Computers & Operations Research* 62, 36–50. https://doi.org/10.1016/j.cor.2015.03.016
14. Gundawar, A., Verma, M., Guan, L., Valmeekam, K., Bhambri, S., Kambhampati, S. (2024). Robust Planning with LLM-Modulo Framework: Case Study in Travel Planning. arXiv:2405.20625 (bài workshop). https://arxiv.org/abs/2405.20625
15. Gunawan, A., Lau, H. C., Vansteenwegen, P. (2016). Orienteering Problem: A survey of recent variants, solution approaches and applications. *European Journal of Operational Research* 255(2), 315–332. https://doi.org/10.1016/j.ejor.2016.04.059
16. Gupta, V., Bedathur, S. (2022). Doing More with Less: Overcoming Data Scarcity for POI Recommendation via Cross-Region Transfer. *ACM TIST*, arXiv:2201.06095. https://arxiv.org/abs/2201.06095
17. Halder, S., Lim, K. H., Chan, J., Zhang, X. (2024). A survey on personalized itinerary recommendation: From optimisation to deep learning. *Applied Soft Computing* 152, 111200. https://kwanhui.github.io/publications/2024-ASOC-surveyDeepTour.pdf
18. Hu, X., Binaykiya, T., Frank, E., Cirit, O. (2022). DeeprETA: An ETA Post-processing System at Scale. arXiv:2206.02127. https://arxiv.org/abs/2206.02127
19. Kambhampati, S., Valmeekam, K., Guan, L., Verma, M., Stechly, K., Bhambri, S., Saldyt, L., Murthy, A. (2024). LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks. *ICML 2024* (PMLR 235). https://arxiv.org/abs/2402.01817
20. Karmakar, P., Chaudhuri, S., Mallick, S., Gupta, M., Jana, A., Ghosh, S., et al. (2025). TripTide: A Benchmark for Adaptive Travel Planning under Disruptions. arXiv:2510.21329 *(nơi đăng chưa xác nhận)*. https://arxiv.org/abs/2510.21329
21. Lim, K. H., Chan, J., Leckie, C., Karunasekera, S. (2015). Personalized Tour Recommendation Based on User Interests and Points of Interest Visit Durations. *IJCAI 2015*, 1778–1784. https://www.ijcai.org/Abstract/15/253
22. Lim, K. H., Chan, J., Karunasekera, S., Leckie, C. (2016). Towards Next Generation Touring: Personalized Group Tours. *ICAPS 2016*. https://ojs.aaai.org/index.php/ICAPS/article/view/13775
23. Lim, K. H., Chan, J., Leckie, C., Karunasekera, S. (2018). Personalized trip recommendation for tourists based on user interests, points of interest visit durations and visit recency. *Knowledge and Information Systems* 54(2), 375–406. https://doi.org/10.1007/s10115-017-1056-y
24. Lim, K. H., Chan, J., Karunasekera, S., Leckie, C. (2019). Tour recommendation and trip planning using location-based social media: a survey. *Knowledge and Information Systems* 60(3), 1247–1275. https://doi.org/10.1007/s10115-018-1297-4
25. Liu, C., Yan, H., Sui, H., Wen, H., Yuan, Y., Han, Y., Liao, H., Ding, X., Hao, J., Li, Y. (2025a). MRGRP: Empowering Courier Route Prediction in Food Delivery Service with Multi-Relational Graph. arXiv:2505.11999. https://arxiv.org/abs/2505.11999
26. Liu, J., Wood, K. L., Lim, K. H. (2019). Strategic and Crowd-Aware Itinerary Recommendation. arXiv:1909.07775. https://arxiv.org/abs/1909.07775
27. Liu, J., Gunawan, A., Wood, K. L., Lim, K. H. (2025b). Optimizing group utility in itinerary planning: a strategic and crowd-aware approach. *Journal of Big Data* 12(1), 201. https://doi.org/10.1186/s40537-025-01249-9
28. Liu, Y., Wu, F., Liu, Z., Wang, K., Wang, F., Qu, X. (2023). Can language models be used for real-world urban-delivery route optimization? *The Innovation* 4(6), 100520. https://ui.adsabs.harvard.edu/abs/2023Innov...400520L
29. Luo, Y., Liu, Q., Liu, Z. (2021). STAN: Spatio-Temporal Attention Network for Next Location Recommendation. *WWW 2021*, 2177–2185. https://arxiv.org/abs/2102.04095
30. Mao, X., Wen, H., Zhang, H., Wan, H., Wu, L., Zheng, J., Hu, H., Lin, Y. (2023). DRL4Route: A Deep Reinforcement Learning Framework for Pick-up and Delivery Route Prediction. *KDD 2023*. https://arxiv.org/abs/2307.16246
31. Nguyen, T. N., Reinelt, G. (2017). On Travel Time Functions for Mixed Traffic Systems Dominated by Motorcycles. In *Modeling, Simulation and Optimization of Complex Processes HPSC 2015*, Springer, 139–150. https://ideas.repec.org/h/spr/sprchp/978-3-319-67168-0_12.html
32. Ruiz-Meza, J., Montoya-Torres, J. R. (2022). A systematic literature review for the tourist trip design problem: Extensions, solution techniques and future research lines. *Operations Research Perspectives* 9, 100228. https://doi.org/10.1016/j.orp.2022.100228
33. Shang, K., Chan, F. T. S., Karungaru, S., Terada, K., Feng, Z., Ke, L. (2017). Two-stage robust optimization for orienteering problem with stochastic weights. arXiv:1701.00090; bản tạp chí: *Complexity* 2020, 5649821, DOI 10.1155/2020/5649821. https://arxiv.org/abs/1701.00090
34. Shen, S., Zhou, Y., Lei, Q., Wu, Z. (2025a). A survey of the orienteering problem: model evolution, algorithmic advances, and future directions. arXiv:2512.16865 (preprint). https://arxiv.org/abs/2512.16865
35. Shen, Y., Wang, K., Lv, C., Zheng, X., Huang, X. (2025b). TripTailor: A Real-World Benchmark for Personalized Travel Planning. *ACL 2025 Findings*, arXiv:2508.01432. https://arxiv.org/abs/2508.01432
36. Sun, K., Qian, T., Chen, T., Liang, Y., Nguyen, Q. V. H., Yin, H. (2020). Where to Go Next: Modeling Long- and Short-Term User Preferences for Point-of-Interest Recommendation. *AAAI 2020*, 214–221. https://ojs.aaai.org/index.php/AAAI/article/view/5353
37. Tang, Y., Wang, Z., Qu, A., Yan, Y., Wu, Z., Zhuang, D., Kai, J., Hou, K., Guo, X., Zheng, H., Luo, T., Zhao, J., Zhao, Z., Ma, W. (2024). ItiNera: Integrating Spatial Optimization with Large Language Models for Open-domain Urban Itinerary Planning. *EMNLP 2024 Industry Track*. https://arxiv.org/abs/2402.07204
38. Vansteenwegen, P., Souffriau, W., Vanden Berghe, G., Van Oudheusden, D. (2009). Iterated local search for the team orienteering problem with time windows. *Computers & Operations Research* 36(12), 3281–3290. https://doi.org/10.1016/j.cor.2009.03.008
39. Vansteenwegen, P., Souffriau, W., Vanden Berghe, G., Van Oudheusden, D. (2011). The City Trip Planner: An expert system for tourists. *Expert Systems with Applications* 38(6), 6540–6546. https://doi.org/10.1016/j.eswa.2010.11.085
40. Varakantham, P., Kumar, A., Lau, H. C., Yeoh, W. (2018). Risk-sensitive stochastic orienteering problems for trip optimization in urban environments. *ACM TIST* 9(3), 24:1–24:25. https://doi.org/10.1145/3080575
41. Verbeeck, C., Vansteenwegen, P., Aghezzaf, E.-H. (2016). Solving the stochastic time-dependent orienteering problem with time windows. *European Journal of Operational Research* 255(3), 699–718. https://econpapers.repec.org/RePEc:eee:ejores:v:255:y:2016:i:3:p:699-718 *(danh sách tác giả cần kiểm theo DOI)*
42. Verbeeck, C., Vansteenwegen, P., Aghezzaf, E.-H. (2017). The time-dependent orienteering problem with time windows: a fast ant colony system. *Annals of Operations Research* 254(1), 481–505. https://doi.org/10.1007/s10479-017-2409-3
43. Wang, D., Zhang, J., Cao, W., Li, J., Zheng, Y. (2018). When Will You Arrive? Estimating Travel Time Based on Deep Neural Networks. *AAAI 2018*, 2500–2507. https://ojs.aaai.org/index.php/AAAI/article/view/11877
44. Wang, S., Laefer, D. F. (2025). Modeling food-related business closure in select New York City communities using multi-scale and spatial features. *Environment and Planning B* 52(1), 247–264. https://econpapers.repec.org/RePEc:sae:envirb:v:52:y:2025:i:1:p:247-264
45. Wang, Z., Höpken, W., Jannach, D. (2023). A Survey on Point-of-Interest Recommendations Leveraging Heterogeneous Data. arXiv:2308.07426 (bản tạp chí liên quan: *Information Technology & Tourism* 2024, DOI 10.1007/s40558-024-00301-3). https://arxiv.org/abs/2308.07426
46. Wen, H., Lin, Y., Mao, X., Wu, F., Zhao, Y., Wang, H., Zheng, J., Wu, L., Hu, H., Wan, H. (2022a). Graph2Route: A Dynamic Spatial-Temporal Graph Neural Network for Pick-up and Delivery Route Prediction. *KDD 2022*, 4143–4152. https://github.com/wenhaomin/graph2route
47. Wen, H., Lin, Y., Wan, H., Guo, S., Wu, F., Wu, L., Song, C., Xu, Y. (2022b). DeepRoute+: Modeling Couriers' Spatial-temporal Behaviors and Decision Preferences for Package Pick-up Route Prediction. *ACM TIST* 13(2), 24:1–24:23. https://dblp.org/rec/journals/tist/WenLWGWWSX22
48. Wen, H., Lin, Y., Wu, L., Mao, X., Cai, T., Hou, Y., Guo, S., Liang, Y., Jin, G., Zhao, Y., Zimmermann, R., Ye, J., Wan, H. (2023). A Survey on Service Route and Time Prediction in Instant Delivery: Taxonomy, Progress, and Prospects. arXiv:2309.01194. https://arxiv.org/abs/2309.01194
49. Wu, L., Wang, Z., Liao, Z., Xiao, D., Han, P., Li, W., Chen, Q. (2024a). Multi-day tourism recommendations for urban tourists considering hotel selection: A heuristic optimization approach. *Omega* 126, 103048. https://doi.org/10.1016/j.omega.2024.103048
50. Wu, L., Wen, H., Hu, H., Mao, X., Xia, Y., Shan, E., Zheng, J., Lou, J., Liang, Y., Yang, L., Zimmermann, R., Lin, Y., Wan, H. (2024b). LaDe: The First Comprehensive Last-mile Delivery Dataset from Industry. arXiv:2306.10675 (2023). https://arxiv.org/abs/2306.10675 *(Một bản ghi Crossref cho thấy có bản KDD 2024 với tên "...Express Dataset...". Cần kiểm lại tên bài và nơi đăng.)*
51. Yang, D., Fankhauser, B., Rosso, P., Cudré-Mauroux, P. (2020). Location Prediction over Sparse User Mobility Traces Using RNNs: Flashback in Hidden States! *IJCAI 2020*, 2184–2190. https://www.ijcai.org/proceedings/2020/302
52. Yang, S., Liu, J., Zhao, K. (2022). GETNext: Trajectory Flow Map Enhanced Transformer for Next POI Recommendation. *SIGIR 2022*, DOI 10.1145/3477495.3531983. https://arxiv.org/abs/2303.04741
53. Yeow, L. W., Low, R., Tan, Y. X., Cheah, L. (2021). Point-of-Interest (POI) Data Validation Methods: An Urban Case Study. *ISPRS International Journal of Geo-Information* 10(11), 735. https://mdpi.com/2220-9964/10/11/735
54. Zhang, L., Pfoser, D. (2019). Using OpenStreetMap point-of-interest data to model urban change: A feasibility study. *PLOS ONE* 14(2), e0212606. https://pmc.ncbi.nlm.nih.gov/articles/PMC6388917
55. Zhang, Y., Liu, Y., Li, G., Ding, Y., Chen, N., Zhang, H., He, T., Zhang, D. (2019). Route Prediction for Instant Delivery. *Proc. ACM IMWUT* 3(3), Article 124. https://doi.org/10.1145/3351282
