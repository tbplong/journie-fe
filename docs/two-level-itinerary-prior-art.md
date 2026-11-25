# Lập lịch 2 tầng (khu → điểm) trong du lịch: đã có chưa?

## 1) Kết luận ngắn

**Ý tưởng hai tầng đã có. Đúng dạng của thiết kế này thì chưa thấy.**

- **Trong tối ưu:** cách "chia cụm/khu trước, xếp điểm sau" đã được dùng cho lịch trình du lịch nhiều ngày. Hai bài gần nhất:
  - [Vathis et al., 2022] gom cụm nhiều tầng để chia ngày cho các điểm đến, rồi giải tour cho từng ngày.
  - [Erbil & Wörndl, 2021] lấy mỗi ngày một cụm quanh khách sạn, rồi dựng tour khứ hồi.
- **Trong học máy:** đã có mô hình vùng → POI [Lim et al., 2022; Sun et al., 2022] và AOI → điểm [Cai et al., 2023]. Các mô hình này đều dùng để **dự đoán** (POI kế tiếp, lộ trình của shipper), không dùng để **lập lịch** nhiều ngày.
- **Chưa thấy bài nào** trong số đã kiểm tra làm cùng lúc ba việc: gán ngày cho quận/khu trong **một** thành phố lớn, xếp điểm ở tầng dưới theo **giờ mở cửa**, và tính thời gian đi lại bằng **xe máy**. Nghĩa là phần còn trống nằm ở cách kết hợp và bối cảnh. Bản thân ý tưởng hai tầng thì không mới.
- **Độ chắc chắn: trung bình đến thấp.** Với [Vathis et al., 2022] và [Erbil & Wörndl, 2021], tôi mới đọc được từ khóa hoặc tóm tắt. Vì vậy chưa loại trừ được khả năng hai bài này đã xử lý giờ mở cửa.

## 2) Những gì đã có

### 2a. Tối ưu (chia cụm trước, OP có cụm, phân rã)

| Bài | Tầng trên / tầng dưới | Cách làm | Dùng cho du lịch? |
|---|---|---|---|
| [Vathis et al., 2022] | Khu điểm đến/lưu trú và số ngày ở mỗi khu / tour orienteering từng ngày từ khách sạn | Gom cụm POI nhiều tầng, chia ngày cho điểm đến, rồi giải tour từng ngày (gần với OPHS) | Có (kỳ nghỉ đi nhiều nơi) |
| [Erbil & Wörndl, 2021] | Mỗi ngày một cụm POI quanh khách sạn / tour khứ hồi trong ngày | Gom cụm trước, dựng tuyến sau; so sánh nhiều thuật toán gom cụm để các ngày cân bằng | Có |
| [Cluster-based TOPTW, 2019] | Cụm địa lý / tuyến ILS nhiều ngày, có khung giờ | Cụm chỉ dẫn hướng local search (làm cụm hấp dẫn hơn), không phải phân rã cứng | Có |
| [Divsalar et al., 2014] | Chuỗi khách sạn qua các ngày / chọn và xếp POI giữa hai khách sạn | Memetic: GA cho tầng trên, local search/VNS cho tầng dưới | Có |
| [Sohrabi et al., 2020] | Chuỗi khách sạn / tour POI giữa hai khách sạn liên tiếp | GRASP; thứ tự khách sạn ảnh hưởng mạnh đến chất lượng lời giải | Có |
| [Angelelli et al., 2014] | Cụm (chỉ nhận lợi nhuận khi thăm đủ mọi điểm của cụm) / tuyến | Branch-and-cut, tabu search | Không (chỉ là mô hình hình thức) |
| [Archetti et al., 2018] | Cụm (nhận lợi nhuận khi thăm ít nhất 1 điểm) / tuyến | Công thức toán và matheuristic | Không |

Phân rã hai tầng là hướng quen thuộc trong vận trù học du lịch. Chỗ khác với thiết kế của bạn nằm ở tầng trên. Ở các bài này, tầng trên là **khách sạn** (OPHS), **điểm đến** của một chuyến đi nhiều nơi, hoặc cụm tính theo **khoảng cách đi bộ**. Không bài nào lấy quận/khu trong một đô thị làm tầng trên.

### 2b. Học máy (mô hình nhiều tầng vùng → POI)

| Bài | Tầng trên / tầng dưới | Cách làm | Dùng cho du lịch? |
|---|---|---|---|
| [Lim et al., 2022] HMT-GRN | Vùng ở nhiều độ mịn / POI | Học đa nhiệm, lấy việc dự đoán vùng kế tiếp làm nhiệm vụ phụ; beam search thu hẹp dần từ vùng xuống POI | Không (dữ liệu check-in) |
| [Sun et al., 2022] MCMG | Vùng và toàn cục / POI của người dùng | Ba kênh mã hóa, trọng số theo vùng | Không |
| [Cai et al., 2023] M2G4RTP | AOI / điểm giao nhận | Graph attention; decoder AOI xếp hạng các AOI rồi dẫn decoder điểm xếp hạng trong từng AOI, kèm dự đoán giờ đến | Không (logistics) |

Học máy đã dùng cấu trúc "khu → điểm", nhưng để mô phỏng hành vi có sẵn. Không bài nào có giờ mở cửa, ngân sách thời gian hay bước gán ngày cho khu. Thông tin về M2G4RTP lấy từ DBLP và một bài khảo sát, tôi chưa đọc bản đầy đủ.

### 2c. Hệ thống dựa trên LLM / công nghiệp

| Bài | Tầng trên / tầng dưới | Cách làm | Dùng cho du lịch? |
|---|---|---|---|
| [Tang et al., 2024] ItiNera | Cụm POI ứng viên / thứ tự POI trong tuyến | Chọn POI theo yêu cầu bằng ngôn ngữ tự nhiên, xếp thứ tự bằng tối ưu không gian theo cụm (TSP phân cấp), rồi LLM viết lịch trình | Có (du lịch đô thị) |
| [Xie et al., 2024] TravelPlanner | Không phân tầng | Benchmark khoảng 4 triệu bản ghi và 1.225 yêu cầu; GPT-4 chỉ đạt tỉ lệ thành công 0,6% | Có |

ItiNera cho thấy một hệ thống thực tế đã dùng gom cụm không gian để xếp POI trong đô thị. Theo các tóm tắt tôi đọc, hệ này không gán ngày cho khu và không xử lý giờ mở cửa, nhưng tôi chưa kiểm tra trong bản đầy đủ. TravelPlanner cho thấy để LLM tự lập lịch nhiều ngày thì gần như luôn thất bại, nên vẫn cần một bộ giải có ràng buộc.

## 3) Bằng chứng du khách đi theo khu

**Có bằng chứng, nhưng mỏng và phần lớn là gián tiếp.**

- **[Lu et al., 2021], Nam Kinh, ảnh Flickr.** Tìm điểm nóng bằng DBSCAN. Quỹ đạo chia thành hai mẫu: đi **trong khu** và đi **giữa các khu**. Du khách chủ yếu đi trong ngày. Đây là bằng chứng gần nhất với giả định "khu → điểm", nhưng tôi chỉ đọc được mức tóm tắt.
- **[Zheng et al., 2012].** Mô hình hóa di chuyển của du khách thành dòng giữa các "vùng hấp dẫn" (RoA) bằng chuỗi Markov, thử trên 4 thành phố lớn. Không thấy con số cụ thể.
- **[Vu et al., 2015], Hồng Kông.** Dữ liệu 29.443 ảnh của 2.100 du khách, phân tích ở mức điểm và mức khu. Tôi chưa đọc được bản đầy đủ nên không trích được kết luận về việc gom theo khu.
- **[Domènech et al., 2020], Toledo.** Điểm tham quan và các khu thương mại–giải trí hỗn hợp định hình cách khách di chuyển; có những "vùng bóng" ít người ghé. Phạm vi chỉ là một khu phố cổ nhỏ.
- **Bằng chứng gián tiếp, không phải từ du khách:**
  - [Sun et al., 2022] thấy di chuyển gắn với vùng của các POI đã ghé.
  - [Lim et al., 2022] cho thấy dự đoán vùng chính xác hơn dự đoán POI (vì dữ liệu POI thưa).
  - [Cai et al., 2023] có bằng chứng tương tự, nhưng với shipper.

**Những gì chưa có:**
- Không có con số kiểu "x% ngày tham quan nằm gọn trong một quận".
- Không có dữ liệu nào cho TP.HCM hay cho đô thị di chuyển bằng xe máy.
- Dữ liệu ảnh geotag thường nghiêng về khách quốc tế.

Vì vậy, trong luận văn nên trình bày "du khách đi theo khu" là một **giả định thiết kế có cơ sở**, không phải điều đã được chứng minh cho TP.HCM.

## 4) Phần còn trống mà luận văn có thể đóng góp

**Khác biệt so với từng nhóm:**

- **So với nhóm tối ưu.** Tầng trên của các bài là khách sạn [Divsalar et al., 2014; Sohrabi et al., 2020], điểm đến của kỳ nghỉ đi nhiều nơi [Vathis et al., 2022], hoặc cụm theo khoảng cách đi bộ [Erbil & Wörndl, 2021]. Phần còn trống gồm:
  - tầng trên là **quận/khu trong một thành phố**, tức đơn vị có nghĩa với người dùng;
  - tầng dưới có **khung giờ mở cửa**;
  - thời gian đi lại bằng **xe máy**, có tính kẹt xe;
  - quy mô khoảng 1.900 POI.
- **So với nhóm học máy.** Các bài đó dự đoán, còn luận văn lập kế hoạch. Bạn có thể mượn ý tưởng decoder hai tầng của M2G4RTP (khu dẫn dắt thứ tự điểm) và áp vào bài toán lập lịch có ràng buộc. Nhưng muốn "học" thật thì cần dữ liệu quỹ đạo du khách ở TP.HCM, và các bài trên không chỉ ra nguồn nào như vậy. Nếu không có dữ liệu, nên viết là "lấy cảm hứng từ cấu trúc của M2G4RTP", không gọi là mô hình học.
- **So với nhóm LLM/công nghiệp.** ItiNera có gom cụm nhưng (theo tóm tắt) không gán ngày cho khu và không xử lý giờ mở cửa. TravelPlanner cho thấy LLM tự làm không giữ được ràng buộc. Phần còn trống là một bộ giải có ràng buộc rõ ràng và kiểm chứng được tính khả thi của lịch trình.
- **Về bối cảnh.** Không bài nào trong danh sách làm cho Việt Nam, TP.HCM hay giao thông xe máy. Đây là đóng góp về bối cảnh và ứng dụng, không phải đóng góp về phương pháp.

**Cần kiểm tra trước khi khẳng định:**
- Đọc bản đầy đủ của [Vathis et al., 2022] và [Erbil & Wörndl, 2021] (cùng bản mở rộng năm 2022) để xem có xử lý giờ mở cửa và khu trong đô thị không.
- Xác minh tác giả của bài APJOR 2019, bài SOP 2018, và năm/số tập của bài Divsalar.

**Cách viết câu đóng góp cho trung thực:**

Nên tránh các cụm "lần đầu tiên", "chưa có nghiên cứu nào", "đề xuất mô hình hai tầng mới".

Câu mẫu:

> Luận văn áp dụng hướng phân rã hai tầng "khu trước, điểm sau" vốn đã được dùng trong thiết kế lịch trình du lịch nhiều ngày [Erbil & Wörndl, 2021; Vathis et al., 2022] vào bối cảnh một đô thị lớn đi lại chủ yếu bằng xe máy. Tầng trên gán mỗi ngày cho một hoặc vài quận/khu của TP.HCM. Tầng dưới chọn và sắp xếp điểm tham quan trong khu theo giờ mở cửa và thời gian di chuyển bằng xe máy, trên tập khoảng 1.900 điểm.

> Trong phạm vi tài liệu đã khảo sát, chúng tôi chưa thấy công trình nào kết hợp cùng lúc ba yếu tố: gán ngày theo khu trong một thành phố, ràng buộc giờ mở cửa và thời gian di chuyển bằng xe máy.

> Luận văn so sánh thực nghiệm phương án hai tầng với phương án một tầng (xếp trực tiếp trên toàn bộ POI) theo các tiêu chí: thời gian di chuyển, số điểm thăm được, số lần vi phạm giờ mở cửa và thời gian chạy.

Câu thứ ba, phần so sánh đo được với baseline một tầng, làm phần đóng góp có sức nặng hơn nhiều so với việc nhấn mạnh tính mới.

## 5) Tài liệu tham khảo

- Angelelli, E., Archetti, C., Vindigni, M. (2014). The Clustered Orienteering Problem. *European Journal of Operational Research* 238(2), 404–414. https://ideas.repec.org/a/eee/ejores/v238y2014i2p404-414.html
- Archetti, C., et al. (2018). The Set Orienteering Problem. *European Journal of Operational Research* 267(1), 264–272. https://econpapers.repec.org/RePEc:eee:ejores:v:267:y:2018:i:1:p:264-272 (danh sách tác giả chưa xác minh)
- Cai, T., Wan, H., Wu, F., Wen, H., Guo, S., Wu, L., Hu, H., Lin, Y. (2023). M2G4RTP: A Multi-Level and Multi-Task Graph Model for Instant-Logistics Route and Time Joint Prediction. *ICDE 2023*, 3296–3308. https://dblp.uni-trier.de/rec/conf/icde/CaiWWW0WHL23.html
- [Cluster-based TOPTW, 2019]. Efficient Cluster-Based Heuristics for the Team Orienteering Problem with Time Windows. *Asia-Pacific Journal of Operational Research*. https://www.aminer.cn/pub/5cc2e574ced107d4c67adaab/efficient-cluster-based-heuristics-for-the-team-orienteering-problem-with-time-windows (tác giả chưa xác minh)
- Divsalar, A., Vansteenwegen, P., Sörensen, K., Cattrysse, D. (2014). A memetic algorithm for the orienteering problem with hotel selection. *European Journal of Operational Research*. https://www.bohrium.com/paper-details/a-memetic-algorithm-for-the-orienteering-problem-with-hotel-selection/813167877023596546-12367 (năm và số tập chưa xác minh)
- Domènech, A., et al. (2020). Using Flickr Geotagged Photos to Estimate Visitor Trajectories in World Heritage Cities. https://docta.ucm.es/entities/publication/b47c01ff-7f14-4176-aa5a-4ab1cd9b631d (nơi đăng chưa xác minh)
- Erbil, E., Wörndl, W. (2021). Generating Multi-Day Round Trip Itineraries for Tourists. *WSDM WebTour 2021 Workshop*. https://web.ec.tuwien.ac.at/webtour21/wp-content/uploads/2021/04/erbil.pdf
- Lim, N., Hooi, B., et al. (2022). Hierarchical Multi-Task Graph Recurrent Network for Next POI Recommendation. *SIGIR 2022*. https://bhooi.github.io/papers/hmt_sigir22.pdf
- Lu, et al. (2021). Spatial patterns and moving trajectory of inbound tourists based on geo-tagged photos: A case study of Nanjing city. *Journal of Natural Resources*. https://www.jnr.ac.cn/EN/10.31497/zrzyxb.20210204
- Sohrabi, S., Ziarati, K., Keshtkaran, M. (2020). A Greedy Randomized Adaptive Search Procedure for the Orienteering Problem with Hotel Selection. *European Journal of Operational Research* 283(2), 426–440. https://econpapers.repec.org/RePEc:eee:ejores:v:283:y:2020:i:2:p:426-440
- Sun, Z., Lei, Y., Zhang, L., Li, C., Ong, Y.-S., Zhang, J. (2022). A Multi-Channel Next POI Recommendation Framework with Multi-Granularity Check-in Signals. *arXiv*. https://arxiv.org/abs/2209.00472
- Tang, Y., Wang, Z., Qu, A., Yan, Y., et al. (2024). ItiNera: Integrating Spatial Optimization with Large Language Models for Open-domain Urban Itinerary Planning. *EMNLP 2024 Industry Track*, 1413–1432. https://aclanthology.org/2024.emnlp-industry.104
- Vathis, N., Konstantopoulos, C., Pantziou, G., Gavalas, D. (2022). The Vacation Planning Problem: a multi-level clustering-based metaheuristic approach. *Computers & Operations Research*. https://portal.mardi4nfdi.de/wiki/Publication:2108189
- Vu, H. Q., Li, G., Law, R., Ye, B. H. (2015). Exploring the travel behaviors of inbound tourists to Hong Kong using geotagged photos. *Tourism Management* 46, 222–232. https://econpapers.repec.org/RePEc:eee:touman:v:46:y:2015:i:c:p:222-232
- Xie, J., Zhang, K., et al. (2024). TravelPlanner: A Benchmark for Real-World Planning with Language Agents. *ICML 2024*. https://arxiv.org/abs/2402.01622
- Zheng, Y.-T., Zha, Z.-J., Chua, T.-S. (2012). Mining Travel Patterns from Geotagged Photos. *ACM Transactions on Intelligent Systems and Technology* 3(3). https://www.aminer.cn/pub/53e9a388b7602d9702c99a1b/mining-travel-patterns-from-geotagged-photos
