# Xếp hạng lại gap nghiên cứu sau kiểm phản chứng

**Tóm tắt.**
- Nên làm **G01** ở dạng đã thu hẹp: sửa lịch trình một ngày giữa chuyến sao cho ít thay đổi nhất, có bảo đảm, dưới khung giờ mở cửa.
- Dự phòng là **G14** (dàn mức hiển thị của POI cho một dòng yêu cầu lịch trình), đã gộp phần còn mở của G12. Lựa chọn thứ ba là **G06**.
- Bị loại vì đã có người giải: **G12**. Ba gap mất một nửa vì đã có người làm: **G09**, **G08**, **G02**.
- Không gap nào còn nguyên như phát biểu ban đầu. Chỉ G16 giữ nhãn "mở", nhưng không hợp điều kiện của sinh viên.
- G05 và G03 (bất định giờ mở cửa) không xét nữa theo ý sinh viên. G05 từng là phương án dự phòng ở bản trước.

**Độ tin của lần kiểm này.**
- Vòng tìm dùng khoảng 6-10 truy vấn web cho mỗi gap, phần lớn bài chỉ đọc tóm tắt hoặc đoạn trích. Chưa tìm trực tiếp trên DBLP, ACM DL, IEEE Xplore, Semantic Scholar. "Chưa thấy" nghĩa là không tìm thấy, không phải đã chứng minh là không có.
- Khi xếp hạng đã mở thêm bốn nguồn then chốt (đánh dấu † trong bảng):
  - Yuan et al. (2026): tra bản HTML toàn văn theo từng câu hỏi cụ thể, chưa đọc tuần tự cả bài.
  - Merinov et al. (2022): đọc cả 6 trang.
  - Slootweg et al. (2024): đọc trang 1-4 và 10-12.
  - Defresne et al. (2025): đọc trang tóm tắt.
- Việc mở thêm này làm G01 rõ hơn và làm G14 hẹp hơn so với kết luận của vòng tìm.
- Bài gần nhất của G01 và G13 là bản thảo arXiv tháng 7-9/2026, chưa qua bình duyệt.
- Các bảng kết quả mẫu để trống số liệu. Không có con số nào trong đó là kết quả thật.

## 1. Bảng 10 gap sau kiểm phản chứng

Nhãn trạng thái:
- **Mở:** không tìm thấy bài nào làm bài toán nhỏ của gap.
- **Một phần:** các mảnh đã có nhưng chưa thấy bài ghép đủ, hoặc một nửa phát biểu đã có người làm.
- **Đã giải:** phát biểu gốc của gap đã có bài làm đúng dạng đó.

Tiêu chí xếp hạng: còn mở đến đâu; có chỗ cho một phương pháp mới; khớp dữ liệu đang có và không cần người chấm; làm xong trong 8-12 tuần; gắn với chuyến đi thành phố.

| Hạng | Gap | Trạng thái mới | Bài gần nhất đã kiểm | Phần còn mở thật sự |
|---|---|---|---|---|
| 1 | G01 Sửa lịch trình giữa chuyến, ít thay đổi nhất | Một phần | † ["Replan, Repair, or Edit? A Unified Empirical Evaluation of Travel Agents for Itinerary Revision under Resource Disruptions"](https://arxiv.org/abs/2609.19654) (Yuan et al., 2026, arXiv 2609.19654). ["An Improvement Heuristic Based on Variable Neighborhood Search for Dynamic Orienteering Problems with Changing Node Values and Changing Budgets"](https://link.springer.com/article/10.1007/s42979-022-01205-x) (Le, Middendorf, Shi, 2022, SN Computer Science 3(4):326) | Bản sửa có chứng minh "ít thay đổi nhất" cho lịch trình một ngày có khung giờ mở cửa; sự cố lan (trễ, mưa); so với bộ giải tối ưu. Bài 2026 chỉ so ba hệ có sẵn, không có mục tiêu giữ giống kế hoạch cũ và không có baseline tối ưu. |
| 2 | G14 Độ tập trung hiển thị của POI (gộp phần còn mở của G12) | Một phần, hẹp hơn kết luận của vòng tìm | † ["Sustainability Driven Recommender Systems"](https://ceur-ws.org/Vol-3177/paper22.pdf) (Merinov, Massimo, Ricci, 2022, IIR workshop, CEUR-WS 3177). ["Capacity-aware fair POI recommendation combining transformer neural networks and resource allocation policy"](https://www.sciencedirect.com/science/article/pii/S156849462300738X) (Halder, Lim, Chan, Zhang, 2023, Applied Soft Computing 147) | Phương pháp trực tuyến trên toàn bộ không gian lịch trình có khung giờ, ở một thành phố thật, với trần độ tập trung hiển thị giữa các POI ngang chất lượng và đường đánh đổi so với mốc ngoại tuyến. Merinov et al. đã cho thấy đánh đổi này ở quy mô rất nhỏ (20 POI giả lập, tuyến soạn sẵn). |
| 3 | G06 Khách mới: hỏi vài câu rồi ra lịch trình | Một phần | ["Interactive itinerary planning"](https://researchwith.njit.edu/en/publications/interactive-itinerary-planning/) (Roy, Das, Amer-Yahia, Yu, 2011, ICDE). † ["Preference Elicitation for Multi-objective Combinatorial Optimization with Active Learning and Maximum Likelihood Estimation"](https://arxiv.org/abs/2503.11435) (Defresne, Mandi, Guns, 2025, arXiv 2503.11435). ["Constructive Preference Elicitation"](https://www.frontiersin.org/article/10.3389/frobt.2017.00071) (Dragone, Teso, Passerini, 2018, Frontiers in Robotics and AI 4:71) | Chọn câu hỏi so sánh cặp có đáp án "sao cũng được" cho lịch trình có khung giờ; đường regret theo số câu hỏi k trên du khách dựng từ lịch trình thật. |
| 4 | G04 Thời lượng tham quan cho POI ít khách | Một phần (bài toán nhỏ chưa thấy ai làm) | ["TripCraft: A Benchmark for Spatio-Temporally Fine Grained Travel Planning"](https://arxiv.org/pdf/2502.20508) (2025, ACL). Bài này chỉ chấm thời lượng, không ước lượng. | Khoảng 80% đã hiệu chỉnh cho POI không có mẫu, theo thuộc tính và ngữ cảnh, kiểm độ phủ trên POI để riêng. Không vào top 3 vì thiếu nhãn thời lượng đáng tin. |
| 5 | G16 Bộ giải OPTW học máy cho thành phố chưa thấy | Mở | ["A Reinforcement Learning Approach to the Orienteering Problem with Time Windows"](https://arxiv.org/abs/2011.03647) (Gama & Fernandes, 2021, arXiv 2011.03647). ["GOAL: A Generalist Combinatorial Optimization Agent Learner"](https://arxiv.org/abs/2406.15079) (Drakulic et al., 2025, ICLR) | Huấn luyện trên POI thật của nhiều thành phố, thử ở thành phố chưa thấy mà không huấn luyện lại, đo khoảng cách tới ILS. Không vào top 3: tốn tính toán, thiếu dữ liệu nhiều thành phố, ít gắn với du lịch. |
| 6 | G13 Học hàm mục tiêu từ lịch trình thật | Một phần | ["From Feasibility to Desirability: Plan, Learn, Adapt (PLA) Framework for Personalized On-Device Itinerary Generation"](https://arxiv.org/abs/2607.15552) (Dev, Sen, Basak, Islam, 2026, arXiv 2607.15552). ["Learning Points and Routes to Recommend Trajectories"](https://arxiv.org/pdf/1608.07051) (Chen, Ong, Xie, 2016, CIKM) | Tìm trọng số mục tiêu của bài toán orienteering có khung giờ từ lịch trình một ngày thật, kèm so mù với người. Cần kho lịch trình thật và người chấm. |
| 7 | G09 Giá trị POI theo giờ và thời tiết | Một phần (nửa lập lịch đã giải) | ["Team orienteering problem with time windows and time-dependent scores"](https://doi.org/10.1016/j.cie.2018.11.044) (Yu et al., 2019, Computers & Industrial Engineering 127). ["Time-Dependent Tourist Tour Planning with Adjustable Profits"](https://drops.dagstuhl.de/opus/volltexte/2020/13150) (Gundling & Witzel, 2020, ATMOS) | Học đường giá trị theo giờ và thời tiết từ dữ liệu, kiểm với nhãn "giờ đẹp nhất". TP.HCM không có dấu thời gian lượt ghé và không có nhãn. |
| 8 | G02 Kiểm và sửa lịch trình do LLM viết | Một phần (nửa đo lường phần lớn đã có) | ["Optimizing LLM-based trip planning"](https://research.google/blog/optimizing-llm-based-trip-planning/) (Zhai & Awasthi, 2025, Google Research blog). ["Iti-Validator: A Guardrail Framework for Validating and Correcting LLM-Generated Itineraries"](https://arxiv.org/abs/2510.24719) (Gadbail, Desai, Karlapalem, 2025, arXiv 2510.24719) | Bộ phân loại vi phạm có precision/recall trên tập gán nhãn tay, cộng bản sửa ít phép sửa nhất có chứng minh; số đo cho một thành phố ngoài Trung Quốc và Mỹ. Nghiêng về đo lường, cần gán nhãn tay. TREK, TravelEval, ChinaTravel, TP-RAG được ghi là đã kiểm giờ mở cửa nhưng chưa đọc được thân bài. |
| 9 | G08 Chuyến nhiều ngày: chia POI vào ngày | Một phần (mô hình đã có) | ["Heuristics for the multi-period orienteering problem with multiple time windows"](https://www.bohrium.com/paper-details/heuristics-for-the-multi-period-orienteering-problem-with-multiple-time-windows/811848281272352769-3917) (Tricoire, Romauch, Doerner, Hartl, 2010, Computers & Operations Research). ["DeepPlanning: Benchmarking Long-Horizon Agentic Planning with Verifiable Constraints"](https://arxiv.org/html/2601.18137) (2026, arXiv 2601.18137) | Chỉ còn một phép đo: mất bao nhiêu lợi ích khi chia ngày trước rồi mới xếp tuyến, so với giải chung. Đây không phải phương pháp mới. |
| 10 | G12 Lịch trình tính đến đám đông, sức chứa | Đã giải (phát biểu gốc) | † ["Centralized multi-visitor trip planning with activity reservations in crowded destinations"](https://ir.cwi.nl/pub/34122/34122.pdf) (Slootweg, van der Mei, Jagtenberg, Ottenhof, 2024, Computers & Operations Research 167) | Chỉ còn bản trực tuyến có đo đánh đổi, chính tác giả nêu là hướng mở. Phần này đã gộp vào G14. TP.HCM không có dữ liệu sức chứa. |

Ghi chú cho bảng:
- G12 được nâng từ "một phần" (nhãn của vòng tìm) lên "đã giải" sau khi đọc Slootweg et al. Bài này lập lịch cho nhiều nhóm khách với sức chứa theo khung giờ, có ca thật ở Amsterdam, chạy được với hơn 10 nghìn khách một ngày. Nó dẫn thêm ba bài orienteering nhiều tác tử có sức chứa (Chen et al. 2014; Wang et al. 2017; Luo et al. 2022). Câu "chỉ mới thử ở công viên giải trí" trong phát biểu gốc không còn đúng.
- G14 bị thu hẹp vì Merinov et al. (2022) đã làm bản thu nhỏ của chính bài toán này. Vòng tìm không thấy bài đó.

## 2. Top 3 gap còn mở

Cả ba đều ở dạng đã thu hẹp; không gap nào còn nguyên.

Hạng B của các hội nghị dưới đây ghi theo trí nhớ về bảng CORE 2023. Bảng ICORE 2026 đã có đợt cập nhật, nhưng cổng tra cứu chặn truy cập tự động nên chưa tra lại được. Phải tra từng hội nghị trên portal.core.edu.au trước khi chọn nơi nộp.

Bộ POI TP.HCM chưa có thời lượng tham quan và ma trận thời gian đi (theo bản xếp hạng trước). Cả ba gap đều phải đặt giả định theo loại POI và theo khoảng cách, và ghi rõ trong bài.

### 2.1. G01: Sửa lịch trình giữa chuyến sao cho ít thay đổi nhất

**Giải thích.** Kế hoạch một ngày đang đi dở thì gặp sự cố. Người đi muốn một bản sửa đi được và giữ gần nguyên phần còn lại, không phải một kế hoạch mới hoàn toàn. Các hệ hiện có hoặc lập lại từ đầu và đổi rất nhiều, hoặc vá cục bộ mà không biết bản vá có phải ít thay đổi nhất không.

**Ví dụ TP.HCM.** Kế hoạch buổi chiều: 13:30 Thảo Cầm Viên (ngoài trời), 15:30 Bưu điện Trung tâm, 16:15 Nhà thờ Đức Bà, 17:00 phố đi bộ Nguyễn Huệ. Lúc 13:20 trời mưa lớn, dự kiến đến 15:00.
- Không sửa: không vào được Thảo Cầm Viên, kế hoạch hỏng.
- Bỏ điểm hỏng: mất một điểm và trống gần hai giờ.
- Một thay đổi: thay Thảo Cầm Viên bằng Bảo tàng Lịch sử ngay cạnh (trong nhà), ba điểm sau giữ nguyên.
- Lập lại từ đầu: có thể thêm chút lợi ích nhưng đổi cả bốn điểm.

Phương pháp cần trả về cả dãy lựa chọn này, kèm bảo đảm "với tối đa k thay đổi thì đây là phương án tốt nhất".

**Bài toán nhỏ.**
- Đầu vào:
  - Phần còn lại của kế hoạch gốc: dãy POI và giờ đến dự kiến.
  - Với mỗi POI: lợi ích, khung giờ mở cửa, thời lượng tham quan, cờ trong nhà/ngoài trời.
  - Ma trận thời gian đi; giờ và vị trí hiện tại; điểm và giờ kết thúc ngày; các POI ứng viên chưa dùng.
  - Một sự cố: trễ X phút, hoặc một khoảng giờ mưa làm POI ngoài trời không dùng được, hoặc một POI đóng cửa.
- Quyết định: dãy POI mới và giờ đến từng điểm.
- Mục tiêu: với mỗi k = 0, 1, 2, ... tìm lợi ích lớn nhất khi dùng tối đa k phép sửa (bỏ, thêm, thay, đổi thứ tự). Kết quả là đường biên lợi ích theo số thay đổi. Dạng một mục tiêu là lợi ích trừ λ nhân số phép sửa.
- Ràng buộc: đến mỗi POI trong khung giờ mở cửa; đủ thời gian đi và tham quan; POI ngoài trời không rơi vào giờ mưa; về điểm cuối trước giờ kết thúc; trả lời trong khoảng 1 giây.

**Khác biệt so với bài gần nhất.**

| Bài | Bài đó làm gì | G01 khác ở đâu |
|---|---|---|
| † Yuan et al. (2026) | So ba hệ có sẵn (LLM cộng Z3 lập lại toàn bộ; IPyHOPPER sửa phân cấp; iTIMO sửa cục bộ) trên 500 sự cố đơn và 200 sự cố kép. Chuyến nhiều ngày liên thành phố; sự cố là chuyến bay, khách sạn hoặc điểm tham quan không còn dùng được. Bộ Z3 không có mục tiêu giữ giống kế hoạch cũ; độ ổn định chỉ đo sau. Không có baseline orienteering hay quy hoạch nguyên. Không thấy nhắc giờ mở cửa. Có đo độ trễ. Phần hạn chế tự ghi: chưa phương pháp nào được chứng minh là trả về bản sửa ít thay đổi nhất. | Lịch trình một ngày trong thành phố, có khung giờ mở cửa, thời lượng và thời gian đi. Số thay đổi nằm trong mục tiêu và có chứng minh tối ưu. Sự cố lan sang nhiều điểm, không chỉ thay một tài nguyên. Có baseline tối ưu. |
| Le, Middendorf, Shi (2022) | Orienteering động: cải thiện tuyến bằng VNS khi giá trị nút hoặc ngân sách thay đổi. Mới đọc tóm tắt. | Thêm khung giờ, phạt thay đổi, sự cố kiểu du lịch. |
| Zhai & Awasthi (2025), bài blog | Sửa kế hoạch do LLM viết trước chuyến, bằng đổi chỗ cục bộ với mục tiêu thưởng độ giống kế hoạch gốc. Không có bài báo và không có số đo. | Sửa giữa chuyến (đã đi một phần, có giờ và vị trí hiện tại), có bảo đảm, có đánh giá công khai. Đây là cơ chế gần nhất, bắt buộc phải trích dẫn. |
| ["TripTide"](https://aclanthology.org/2026.findings-acl.2002/) (Karmakar et al., Findings of ACL 2026) | Benchmark đo LLM sửa kế hoạch khi có sự cố. Có kiểu khách muốn ít thay đổi (chỉ thấy qua kết quả tìm). | Là một phương pháp tối ưu, không phải benchmark. |

Hai điều phải nói thẳng:
- **Khái niệm không mới.** "Ổn định kế hoạch" đã có từ lâu trong lập kế hoạch tự động; Yuan et al. trích bài "Plan stability: replanning versus plan repair". Mảng định tuyến xe cũng có hướng quản lý gián đoạn với mục tiêu ít lệch kế hoạch (nhớ lại, chưa kiểm). Điểm mới của G01 là bài toán cụ thể cho orienteering có khung giờ.
- **Sự cố một điểm đóng cửa gần như hiển nhiên.** Theo số liệu của Yuan et al., với sự cố đơn hai cách sửa đã đạt khoảng 1 phép sửa và giữ hơn 90% vị trí. Lập lại toàn bộ thì đổi 6-7 thành phần và giữ khoảng 65%. Các số này chép qua bước trích tự động, cần đối chiếu bản gốc. Phần khó và mới là sự cố lan: trễ hoặc mưa kéo dài làm nhiều điểm phía sau cùng lúc không còn kịp giờ.

**Hướng tiếp cận khả dĩ.**
1. **Quy hoạch động có đếm phép sửa.** Coi số phép sửa là một tài nguyên trong thuật toán gán nhãn: trạng thái gồm điểm cuối, giờ, các điểm đã dùng, số phép sửa đã tiêu. Một lần chạy trả về cả đường biên lợi ích theo k, kèm chứng minh "tốt nhất trong k phép sửa". Khả thi vì phần còn lại của một ngày chỉ khoảng 3-8 điểm.
2. **Vá theo độ dư thời gian.** Mỗi điểm còn lại có một độ dư, tức có thể lùi bao lâu mà các điểm sau vẫn kịp giờ. Sự cố ăn vào độ dư; chỉ sửa đoạn ngắn nhất đã hết độ dư và nới vùng sửa khi chưa khả thi. Cách này rất nhanh, dùng cho ca lớn và chuyến nhiều ngày; đo khoảng cách tới đường biên chính xác.
3. **Tìm kiếm lân cận có phạt thay đổi**, khởi động từ kế hoạch gốc, lân cận là chính các phép sửa. Đây là phần mở rộng tự nhiên của cách làm trong Le et al., nên hợp làm baseline mạnh hơn là đóng góp chính.

**Thí nghiệm.**
- Dữ liệu:
  - Benchmark OPTW/TOPTW công khai. Kế hoạch gốc là lời giải tốt nhất đã biết hoặc lời giải ILS; cắt tại 25%, 50%, 75% thời gian của ngày; chèn trễ 15/30/60 phút hoặc đóng một điểm. Cờ ngoài trời trên benchmark phải gán giả lập và ghi rõ.
  - Bộ POI TP.HCM. Kế hoạch gốc lập bằng ILS cho khách mô phỏng. Sự cố mưa lấy từ chuỗi thời tiết thật theo giờ: giờ nào mưa trên ngưỡng thì POI ngoài trời không dùng được.
  - Kịch bản sự cố của TripTide cho baseline LLM, nếu lấy được (chưa kiểm dữ liệu có công khai không). Không thấy Yuan et al. công bố mã và dữ liệu.
- Baseline: bỏ điểm hỏng rồi đi tiếp; tối ưu lại toàn bộ không phạt (ILS, và lời giải chính xác trên ca nhỏ); mô hình quy hoạch nguyên có phạt thay đổi làm mốc chính xác; VNS kiểu Le et al. thêm khung giờ; LLM sửa (cố định phiên bản, công bố lời nhắc và đầu ra).
- Metric: lợi ích giữ được so với tối ưu lại toàn bộ; số phép sửa và tỉ lệ điểm giữ nguyên (cùng thước đo với Yuan et al.); tỉ lệ bản sửa khả thi; thời gian trả lời trung vị và P95; tỉ lệ ca mà tối đa 2 phép sửa đạt từ 95% lợi ích của tối ưu lại.

Bảng kết quả mẫu (ô trống là chưa có số liệu):

| Phương pháp | Lợi ích giữ được (% so với tối ưu lại) | Số phép sửa trung bình | Điểm giữ nguyên (%) | Bản sửa khả thi (%) | Thời gian trung vị / P95 |
|---|---|---|---|---|---|
| Bỏ điểm hỏng rồi đi tiếp | … | … | … | … | … |
| Tối ưu lại toàn bộ, không phạt | 100 (mốc) | … | … | … | … |
| Quy hoạch nguyên có phạt thay đổi | … | … | … | … | … |
| VNS kiểu Le et al., thêm khung giờ | … | … | … | … | … |
| LLM sửa | … | … | … | … | … |
| Đề xuất 1: đường biên theo k phép sửa | … | … | … | … | … |
| Đề xuất 2: vá theo độ dư thời gian | … | … | … | … | … |

Giả thuyết cần kiểm: tối đa 2 phép sửa đã đạt gần bằng lợi ích của tối ưu lại, trong khi tối ưu lại đổi phần lớn các điểm còn lại. Nếu số liệu không ủng hộ thì đóng góp mỏng.

**Khả thi 8-12 tuần.** Cao: không cần gán nhãn, người chấm hay GPU.
- Tuần 1: đọc toàn văn bốn bài gần nhất; tìm lại trên DBLP và Google Scholar; chốt định nghĩa phép sửa.
- Tuần 2-3: bộ sinh sự cố; chuẩn bị bộ TP.HCM; hai baseline đơn giản; đo ngay mức thay đổi của tối ưu lại toàn bộ.
- Tuần 4-7: hai phương pháp đề xuất, mốc chính xác, VNS.
- Tuần 8-9: thí nghiệm đầy đủ và baseline LLM.
- Tuần 10-12: viết bài.
- Rủi ro: tối ưu lại toàn bộ vốn đã ít đổi kế hoạch; có bài mới xuất hiện trong lúc làm; giả định về thời lượng và thời gian đi ở TP.HCM.

**Hội nghị hạng B.** ICTAI, PRICAI. EvoCOP hoặc IEEE CEC nếu trọng tâm là metaheuristic. CPAIOR nếu trọng tâm là thuật toán chính xác.

### 2.2. G14: Dàn mức hiển thị của POI cho một dòng yêu cầu lịch trình

**Giải thích.** Bộ lập lịch trả cho mỗi khách lịch trình tốt nhất của riêng họ. Điểm số POI gần giống nhau với mọi người, nên vài POI nổi tiếng xuất hiện trong hầu hết lịch trình, còn nhiều nơi chất lượng tương đương không bao giờ được gợi ý. Bài toán là dàn mức hiển thị giữa các POI ngang chất lượng mà mỗi khách chỉ mất rất ít lợi ích.

**Ví dụ TP.HCM.** Có 1.000 yêu cầu lịch trình một ngày xuất phát từ khu trung tâm. Gần như lịch trình nào cũng có Dinh Độc Lập, Bưu điện Trung tâm, Bảo tàng Chứng tích Chiến tranh, chợ Bến Thành. Giả sử Bảo tàng Mỹ thuật, Bảo tàng Y học cổ truyền và chùa Bà Thiên Hậu có điểm đánh giá tương đương nhưng chỉ xuất hiện trong vài phần trăm lịch trình. Một phương pháp tốt sẽ đổi một điểm cho những khách vốn thấy hai lựa chọn gần ngang nhau. Mỗi khách như vậy mất rất ít lợi ích, còn mức hiển thị dàn đều hơn rõ rệt.

**Bài toán nhỏ.**
- Đầu vào:
  - Các POI có điểm chất lượng (điểm đánh giá), loại, khu vực, giờ mở cửa, thời lượng.
  - Các nhóm POI ngang chất lượng: cùng loại, điểm đánh giá trong cùng một dải.
  - Một dòng yêu cầu đến lần lượt; mỗi yêu cầu có điểm xuất phát, quỹ thời gian, thứ trong tuần, trọng số sở thích theo loại.
  - Một mức trần độ tập trung, ví dụ chỉ số Gini của số lần được gợi ý trong mỗi nhóm.
- Quyết định: một lịch trình cho mỗi yêu cầu ngay khi nó đến, chỉ biết các lịch trình đã phát trước đó.
- Mục tiêu: tối đa tổng lợi ích của khách dưới mức trần; báo cáo cả đường đánh đổi giữa lợi ích trung bình và độ tập trung.
- Ràng buộc: mỗi lịch trình thoả khung giờ mở cửa và quỹ thời gian; không khách nào mất quá ε so với lịch trình tốt nhất của riêng mình; trả lời từng yêu cầu trong thời gian tương tác.

**Khác biệt so với bài gần nhất.**

| Bài | Bài đó làm gì | G14 khác ở đâu |
|---|---|---|
| † Merinov, Massimo, Ricci (2022) | Khách đến lần lượt. Mỗi khách nhận lịch trình tối đa lợi ích của khách cộng α nhân "lợi ích môi trường", là một hàm giảm dần theo mức lấp đầy của POI. Tìm kiếm chùm trong các tuyến mẫu do chuyên gia soạn. Mô phỏng 20 POI giả lập, sức chứa 10, 5 kiểu khách. Cho thấy có đánh đổi giữa hai loại lợi ích. Không có giờ mở cửa, thành phố thật, baseline hay mốc tối ưu. Hướng mở tác giả nêu: tìm trên mọi hoán vị POI thay vì chỉ trong tuyến mẫu. | Toàn bộ không gian lịch trình có khung giờ. Thành phố thật với 900-1.900 POI. Ràng buộc là độ tập trung hiển thị giữa các POI ngang chất lượng, không cần số liệu sức chứa. Có mốc ngoại tuyến và baseline. |
| † Slootweg et al. (2024) | Lập lịch tập trung cho mọi nhóm khách cùng lúc, đặt chỗ theo khung giờ có sức chứa. Mục tiêu là tổng mức hài lòng của khách; công bằng giữa các khách. Hướng mở tác giả nêu: bản trực tuyến. | Trực tuyến, khách đến dần và không biết trước. Công bằng phía POI, không phải phía khách. Không cần hệ thống đặt chỗ. |
| Halder et al. (2023); [CAPRI-FAIR](https://arxiv.org/abs/2406.03109) (2024); [SPACE](https://arxiv.org/abs/2608.07998) (2026) | Công bằng hiển thị cho xếp hạng POI hoặc dự đoán POI kế tiếp. | Lịch trình nhiều điểm có khung giờ và quỹ thời gian. |
| [Dalla Vecchia et al.](https://link.springer.com/10.1007/s40558-024-00288-x) (2024); [Merinov & Ricci](https://bia.unibz.it/esploro/outputs/conferenceProceeding/Positive-Sum-Impact-of-Multistakeholder-Recommender-Systems/991007330261501241) (RecSys 2024); [Sánchez & Bellogín](https://repositorio.comillas.edu/items/5dccb9d3-6844-4ea7-b7de-01ad575200dc) (2024) | Lần lượt: gợi ý chuỗi điểm tránh quá tải bằng học tăng cường trên dữ liệu Verona; gợi ý đa bên cho du lịch đô thị; xếp hạng lại tuyến theo mục tiêu bền vững. | Chưa đọc cả ba, chỉ thấy tên hoặc tóm tắt. Có thể gần hơn mô tả ở đây. |

Về hình thức, trần hiển thị cho từng POI chính là một ràng buộc sức chứa. Vì vậy mảng orienteering nhiều tác tử có sức chứa là hàng xóm trực tiếp, và tính mới của G14 mỏng hơn kết luận của vòng tìm.

**Hướng tiếp cận khả dĩ.**
1. **Giá đối ngẫu trực tuyến.** Mỗi POI có một mức giá, tăng khi POI được gợi ý nhiều hơn phần công bằng của nó và giảm khi ít hơn. Mỗi yêu cầu giải một bài orienteering có khung giờ thông thường với điểm số đã trừ giá, nên dùng lại được bất kỳ bộ giải nào. Kỹ thuật này quen thuộc ở phân bổ tài nguyên trực tuyến; điểm mới là đặt vào lập lịch trình và so với mốc ngoại tuyến.
2. **Chọn ngẫu nhiên trong tập lịch trình gần tối ưu.** Với mỗi yêu cầu, sinh vài lịch trình đạt ít nhất (1 − ε) lợi ích tốt nhất, rồi chọn một lịch trình theo xác suất làm mức hiển thị đều hơn. Khách không bao giờ mất quá ε, theo cách xây dựng.
3. **Mốc ngoại tuyến bằng sinh cột** trên ca nhỏ: biết trước mọi yêu cầu thì đường đánh đổi tốt nhất là gì. Dùng để đo phương pháp trực tuyến còn cách bao xa.

**Thí nghiệm.**
- Dữ liệu:
  - Bộ POI TP.HCM: điểm đánh giá làm điểm chất lượng; nhóm theo loại và dải điểm.
  - Dòng yêu cầu mô phỏng: điểm xuất phát theo khu vực, quỹ thời gian 4-10 giờ, trọng số sở thích lấy mẫu từ phân phối khớp trên các bộ Flickr của Lim et al.
  - Benchmark TOPTW với nhiều yêu cầu lấy mẫu, để người khác chạy lại được.
- Baseline: tối ưu riêng cho từng khách (ILS); phạt độ nổi tiếng cố định; trần cứng cho mỗi POI rồi gán tham lam; phạt theo mức lấp đầy kiểu Merinov et al.; mốc ngoại tuyến trên ca nhỏ.
- Metric: lợi ích trung bình so với tối ưu riêng; lợi ích của 10% khách thiệt nhất; Gini hiển thị trong nhóm; phần hiển thị của 10% POI đứng đầu; tỉ lệ POI được gợi ý ít nhất một lần; khoảng cách tới mốc ngoại tuyến; thời gian mỗi yêu cầu.

Bảng kết quả mẫu (ô trống là chưa có số liệu):

| Phương pháp | Lợi ích trung bình (% so với tối ưu riêng) | Lợi ích của 10% khách thiệt nhất (%) | Gini hiển thị trong nhóm | Phần hiển thị của 10% POI đầu (%) | POI được gợi ý ít nhất một lần (%) | Thời gian mỗi yêu cầu |
|---|---|---|---|---|---|---|
| Tối ưu riêng từng khách | 100 (mốc) | 100 (mốc) | … | … | … | … |
| Phạt độ nổi tiếng cố định | … | … | … | … | … | … |
| Trần cứng mỗi POI, gán tham lam | … | … | … | … | … | … |
| Phạt theo mức lấp đầy kiểu Merinov et al. | … | … | … | … | … | … |
| Mốc ngoại tuyến (ca nhỏ) | … | … | … | … | … | … |
| Đề xuất 1: giá đối ngẫu trực tuyến | … | … | … | … | … | … |
| Đề xuất 2: chọn ngẫu nhiên trong tập gần tối ưu | … | … | … | … | … | … |

**Khả thi 8-12 tuần.** Cao về kỹ thuật, không cần nhãn.
- Tuần 1: đọc ba bài chưa đọc; chốt định nghĩa nhóm ngang chất lượng và thước đo.
- Tuần 2-3: bộ sinh yêu cầu; đo độ tập trung khi ai cũng nhận lịch trình tốt nhất của riêng mình. Nếu độ tập trung vốn thấp thì gap không có ý nghĩa ở TP.HCM và nên dừng.
- Tuần 4-7: hai phương pháp và mốc ngoại tuyến.
- Tuần 8-12: thí nghiệm và viết bài.
- Rủi ro:
  - Tính mới mỏng: ba bài chưa đọc, và mảng sức chứa là hàng xóm trực tiếp.
  - Nhu cầu là mô phỏng.
  - Bằng chứng về tầm quan trọng chỉ ở mức survey (4 nguồn).
  - Định nghĩa "ngang chất lượng" dễ bị phản biện.
  - Chưa kiểm được khách có chấp nhận POI ít nổi tiếng không.

**Hội nghị hạng B.** PRICAI, ICTAI, DASFAA, WISE, IEEE BigData, ACM SAC.

### 2.3. G06: Khách mới, hỏi vài câu rồi ra lịch trình

**Giải thích.** Gần như mọi người dùng một bộ lập lịch trình là khách lần đầu đến, không có lịch sử ở thành phố đó. Hỏi một bảng dài thì không ai trả lời; không hỏi gì thì ai cũng nhận cùng một danh sách nổi tiếng. Câu hỏi nghiên cứu là nên hỏi câu nào trước để sau ít câu nhất, lịch trình đã gần với lịch trình lý tưởng của người đó.

**Ví dụ TP.HCM.** Một khách đến TP.HCM hai ngày. Hệ thống hỏi 4 câu như "Chợ Bến Thành hay Bảo tàng Mỹ thuật?", "Một buổi chiều ở Chợ Lớn hay ở Thảo Điền?", và cho phép trả lời "sao cũng được". Nếu câu trả lời nào cũng dẫn đến cùng một lịch trình thì câu hỏi đó vô ích, dù nó cho biết thêm về sở thích. Câu hỏi đáng hỏi là câu mà hai đáp án dẫn đến hai lịch trình khác nhau nhiều.

**Bài toán nhỏ.**
- Đầu vào: các POI của một thành phố kèm thuộc tính, giờ mở cửa, thời lượng; một khách mới có trọng số sở thích chưa biết; tối đa k câu hỏi. Mỗi câu là chọn giữa hai POI hoặc hai lịch trình ngắn, có đáp án "sao cũng được".
- Quyết định: câu hỏi tiếp theo, rồi lịch trình cuối cùng.
- Mục tiêu: giảm regret theo k. Regret là lợi ích của lịch trình lập khi biết hết sở thích, trừ lợi ích của lịch trình trả về.
- Ràng buộc: không quá k câu hỏi; lịch trình thoả khung giờ mở cửa và quỹ thời gian; chọn câu hỏi kế tiếp trong khoảng 1 giây.

**Khác biệt so với bài gần nhất.**

| Bài | Bài đó làm gì | G06 khác ở đâu |
|---|---|---|
| Roy et al. (2011) | Vòng lặp: hệ thống chọn một nhóm POI để xin phản hồi, rồi dựng lại lịch trình tốt nhất từ mọi phản hồi. Phản hồi theo từng điểm. Mới đọc tóm tắt. | Câu hỏi so sánh cặp có đáp án "sao cũng được"; khung giờ mở cửa; đo regret theo k. |
| † Defresne, Mandi, Guns (2025) | So sánh cặp giữa hai lời giải, mô hình Bradley-Terry, chọn cặp bằng học chủ động. Thử trên bài toán cấu hình máy tính và một bài toán định tuyến. Không nhắc du lịch. Mới đọc tóm tắt. | Lịch trình du lịch có khung giờ; khách mô phỏng dựng từ lịch trình thật; chọn câu hỏi theo mức thay đổi của lịch trình cuối. Đây là bài gần nhất về kỹ thuật và phải lấy làm baseline. |
| Dragone, Teso, Passerini (2018) | Khung khai thác sở thích trên đối tượng được dựng ra, lấy chuyến du lịch làm ví dụ dẫn. | Đánh giá trên lịch trình thành phố với regret theo k. |
| Fink (2025), luận văn | So các kiểu hỏi (vuốt, chấm điểm, chọn trong 2 hoặc 4) cho khởi đầu lạnh ở hoạt động giải trí. | Có dựng lịch trình và đo regret. |

Mảng khai thác sở thích tăng dần dựa trên regret cho bài toán tổ hợp cũng đã có nhiều bài; chỉ thấy qua kết quả tìm, chưa đọc. Tính mới của G06 nằm ở bài toán du lịch và cách đánh giá, không nằm ở ý tưởng "hỏi rồi tối ưu".

**Hướng tiếp cận khả dĩ.**
1. **Chọn câu hỏi theo mức giảm regret kỳ vọng của lịch trình.** Giữ một tập mẫu trọng số sở thích còn hợp lý. Với mỗi câu hỏi ứng viên, tính lịch trình tốt nhất dưới từng đáp án và chọn câu làm regret kỳ vọng giảm nhiều nhất. Mỗi bước phải giải nhiều bài orienteering nhỏ, ILS đủ nhanh.
2. **Mô hình trả lời ba mức.** "Sao cũng được" được coi là thông tin: hai lựa chọn chênh nhau dưới một ngưỡng. Dùng mô hình so sánh cặp có hoà để cập nhật.
3. **Câu hỏi là hai lịch trình ngắn**, lấy từ hai nhóm sở thích còn khả dĩ nhất, để hỏi thẳng vào quyết định. So với câu hỏi ở mức POI.

**Thí nghiệm.**
- Dữ liệu:
  - Du khách mô phỏng: với mỗi người dùng thật trong các bộ Flickr của Lim et al., suy trọng số theo loại POI từ lịch sử ghé thăm và coi đó là sở thích thật.
  - Bộ POI TP.HCM cho phần có giờ mở cửa, với khách lấy mẫu từ phân phối vừa khớp.
  - Một thử nghiệm nhỏ 10-20 người nếu còn thời gian.
- Baseline: không hỏi gì (theo độ nổi tiếng); hỏi ngẫu nhiên; bảng hỏi cố định theo loại POI; chọn câu làm giảm bất định về trọng số nhiều nhất; cách chọn kiểu Defresne et al.; phản hồi theo nhóm POI kiểu Roy et al.; hội thoại tự do với LLM cùng số lượt (tuỳ chọn).
- Metric: regret theo k từ 0 đến 10; số câu cần để regret dưới 5%; độ bền khi 10-20% câu trả lời bị nhiễu; thời gian chọn mỗi câu hỏi.

Bảng kết quả mẫu (ô trống là chưa có số liệu):

| Cách chọn câu hỏi | Regret k=0 | k=2 | k=4 | k=6 | k=8 | Số câu để regret dưới 5% |
|---|---|---|---|---|---|---|
| Không hỏi, theo độ nổi tiếng | … | (không áp dụng) | (không áp dụng) | (không áp dụng) | (không áp dụng) | (không áp dụng) |
| Hỏi ngẫu nhiên | … | … | … | … | … | … |
| Bảng hỏi cố định theo loại POI | … | … | … | … | … | … |
| Giảm bất định về trọng số | … | … | … | … | … | … |
| Kiểu Defresne et al. (2025) | … | … | … | … | … | … |
| Đề xuất: theo thay đổi của lịch trình | … | … | … | … | … | … |

**Khả thi 8-12 tuần.** Vừa. Mô phỏng thì rẻ và dùng lại được bộ giải lịch trình. Ba rủi ro:
- Kết quả có thể không tách được các cách chọn câu hỏi: chỉ với vài loại POI thì hỏi ngẫu nhiên cũng hội tụ nhanh.
- Khách mô phỏng trả lời theo một mô hình tuyến tính, nên người phản biện có thể đòi thử với người thật.
- Các bộ Flickr không có giờ mở cửa (theo trí nhớ, cần kiểm), nên phần có khung giờ phải làm trên bộ TP.HCM với khách mô phỏng.

**Hội nghị hạng B.** PRICAI, ICTAI, ACM SAC, UMAP.

## 3. Khuyến nghị

**Chọn G01, dạng thu hẹp: sửa lịch trình một ngày sao cho ít thay đổi nhất dưới khung giờ mở cửa.**

Lý do:
1. **Đúng dạng sinh viên muốn.** Một bài toán nhỏ, định nghĩa gọn, và một phương pháp mới: đường biên lợi ích theo số phép sửa, có bảo đảm. Không phải một ứng dụng.
2. **Khoảng trống rõ hơn sau khi kiểm.** Bài gần nhất (Yuan et al., 2026) là một bài so sánh, không đề xuất phương pháp. Bài đó không có mục tiêu giữ giống kế hoạch cũ, không có baseline tối ưu, không thấy nhắc giờ mở cửa. Nó tự ghi là chưa phương pháp nào được chứng minh trả về bản sửa ít thay đổi nhất. Nó cũng cho sẵn thước đo để so sánh.
3. **Dùng hết dữ liệu đang có.** Benchmark OPTW/TOPTW, giờ mở cửa và cờ trong nhà/ngoài trời của bộ TP.HCM, mưa thật theo giờ. Không cần gán nhãn hay người chấm.
4. **Không phải ý tưởng bất định giờ mở cửa.** Sự cố là dữ kiện cho trước, không phải thứ cần ước lượng. Có thể chỉ dùng trễ và mưa.

Điểm yếu phải nói rõ:
- Tính mới là ghép các mảnh đã có: ổn định kế hoạch, orienteering động, sửa có thưởng độ giống. Đủ cho hạng B nếu định vị đúng.
- Mảng này ra bài rất nhanh: TripTide (10/2025, nay ở Findings of ACL 2026), iTIMO, rồi Yuan et al. (9/2026). Trong 8-12 tuần có thể có bài mới.
- Bài toán một ngày khá nhỏ. Nếu tối ưu lại toàn bộ vốn đã ít đổi kế hoạch thì đóng góp mỏng.

Hai cổng quyết định:
- **Tuần 1:** đọc toàn văn Yuan et al., TripTide, Le et al. và bài blog của Google; tìm trực tiếp trên DBLP và Google Scholar. Nếu có bài đã tối ưu số thay đổi cho orienteering có khung giờ thì chuyển sang G14.
- **Tuần 3:** nếu tối ưu lại toàn bộ chỉ đổi trung bình không quá một điểm thì chuyển sang G14.

**Dự phòng: G14.** Rủi ro của nó độc lập với G01, vì đây là bài toán nhiều khách chứ không phải sửa một kế hoạch. Nó dùng lại bộ giải orienteering và phần chuẩn bị dữ liệu TP.HCM. Trước khi chuyển phải đọc ba bài chưa đọc: Merinov & Ricci (RecSys 2024), Dalla Vecchia et al. (2024), Sánchez & Bellogín (2024).

**Các gap bị loại.**

Vì đã có người giải:
- **G12:** lập lịch cho nhiều khách có sức chứa ở thành phố mở đã có (Slootweg et al., 2024, cùng mảng orienteering nhiều tác tử có sức chứa). Bản khách đến lần lượt cũng đã có ở quy mô nhỏ (Merinov et al., 2022). Phần còn lại đã gộp vào G14.

Vì một nửa đã có người giải và nửa còn lại không hợp:
- **G09:** lập lịch với điểm số phụ thuộc thời gian đã có (Yu et al., 2019; Gundling & Witzel, 2020). Nửa còn lại là học đường giá trị từ dữ liệu, mà TP.HCM không có dấu thời gian lượt ghé và nhãn "giờ đẹp nhất".
- **G08:** mô hình nhiều ngày giải chung đã là chuẩn (Tricoire et al., 2010; bản thân TOPTW), và đã có benchmark nhiều ngày (DeepPlanning, 2026). Chỉ còn một phép đo, không phải phương pháp mới.
- **G02:** nhiều benchmark 2025-2026 đã kiểm giờ mở cửa và thời gian đi, và đã có cách sửa giữ gần kế hoạch gốc (bài blog Google, 2025). Phần còn lại nghiêng về đo lường và cần gán nhãn tay. Các benchmark này chưa đọc được thân bài.

Vì lý do khác, chưa ai giải:
- **G13:** PLA (2026) đã học hàm thưởng từ so sánh cặp của người. Phần còn lại cần kho lịch trình thật và người chấm.
- **G04:** bài toán nhỏ chưa thấy ai làm, nhưng không có nhãn thời lượng đáng tin. Các bộ Flickr suy thời lượng từ dấu thời gian ảnh, mỗi thành phố chỉ vài chục POI với rất ít thuộc tính (theo trí nhớ, cần đếm lại). Bộ TP.HCM không có mẫu thời lượng.
- **G16:** là gap duy nhất còn nhãn "mở". Bị loại vì cần POI thật có giờ mở cửa của nhiều thành phố trong khi hiện chỉ có TP.HCM, tốn tính toán, và ILS không cần huấn luyện nên kết quả dễ là "không thắng ILS".

Theo ý sinh viên, không phải vì đã có người giải:
- **G05 và G03:** hai ý tưởng về bất định giờ mở cửa.

## Nguồn (Sources)

Các nguồn mở thêm khi xếp hạng:
- [Yuan et al. (2026), trang tóm tắt arXiv 2609.19654](https://arxiv.org/abs/2609.19654) và [bản HTML toàn văn](https://arxiv.org/html/2609.19654)
- [Slootweg et al. (2024), Computers & Operations Research 167](https://ir.cwi.nl/pub/34122/34122.pdf)
- [Merinov, Massimo, Ricci (2022), CEUR-WS 3177](https://ceur-ws.org/Vol-3177/paper22.pdf)
- [Defresne, Mandi, Guns (2025), arXiv 2503.11435](https://arxiv.org/abs/2503.11435)
- [TripTide, Findings of ACL 2026](https://aclanthology.org/2026.findings-acl.2002/) và [bản arXiv](https://arxiv.org/html/2510.21329v1)
- [Dalla Vecchia et al. (2024), Information Technology & Tourism](https://link.springer.com/10.1007/s40558-024-00288-x)
- [Merinov & Ricci (RecSys 2024), bản ghi kho lưu trữ](https://bia.unibz.it/esploro/outputs/conferenceProceeding/Positive-Sum-Impact-of-Multistakeholder-Recommender-Systems/991007330261501241)
- [Sánchez & Bellogín (2024), bản ghi kho lưu trữ](https://repositorio.comillas.edu/items/5dccb9d3-6844-4ea7-b7de-01ad575200dc)
- [CAPRI-FAIR, arXiv 2406.03109](https://arxiv.org/abs/2406.03109)
- [Dragone, Teso, Passerini (2018)](https://www.frontiersin.org/article/10.3389/frobt.2017.00071)
- [Ghi chú cập nhật bảng ICORE 2026](https://www.core.edu.au/icore-portal/icore-portal-2026-rankings-updates)
