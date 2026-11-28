# Ghi chú quyết định: lập lịch tham quan khi giờ mở cửa không chắc chắn

## Tóm tắt quyết định

- **Khuyến nghị:** Nên chọn gap này, nhưng phải thu hẹp lại. Bài nên trả lời câu hỏi: *xác suất mở cửa được ước lượng từ các nguồn bất đồng có giúp lịch trình ít gặp cửa đóng hơn không, và phải hy sinh bao nhiêu lợi ích để đạt được điều đó?* Không nên định vị bài là "thuật toán orienteering mới".
- **Độ mới:** Đây là gap kết hợp. Mỗi nửa đã có người làm: lập lịch có ràng buộc xác suất, và truth discovery. Trong danh sách bài đã kiểm chứng, chưa có công trình nào ước lượng xác suất mở cửa theo từng khung giờ từ nhiều nguồn mâu thuẫn rồi dùng xác suất đó để lập lịch.
- **Hội nghị:**
  - Mục tiêu chính: **MDM 2027**. Hạn chưa công bố, dự kiến tháng 1–3/2027.
  - Dự phòng: SSTD 2027 (nếu năm đó có tổ chức), PRICAI 2027 hoặc WISE 2027 (khoảng tháng 6/2027).
  - Không kịp: PAKDD, DASFAA và CPAIOR 2027. ACIIDS 2027 đã qua hạn.
- **Điều kiện đi tiếp (hết tuần 1):** Cần đủ POI có giờ mở cửa từ ít nhất 2 nguồn, và mức bất đồng giữa các nguồn phải đủ lớn. Nếu không đạt thì xoay hướng (xem mục 1.4).

---

## 1. Độ mới

### 1.1 Những gì đã có, gần nhất trước

| Công trình | Có cửa sổ giờ mở? | Bất định nằm ở đâu | Xác suất có được ước lượng từ nhiều nguồn? | Xử lý rủi ro | Nhiều ngày? |
|---|---|---|---|---|---|
| [Zhang et al., 2015](https://www2.cs.sfu.ca/~wangk/pub/TripRec.pdf) (CIKM; bản mở rộng ở ACM TIST) | Có, coi là biết chắc | Thời gian di chuyển | Không | Ngưỡng xác suất hoàn thành | Không |
| [Verbeeck et al., 2016](https://econpapers.repec.org/RePEc:eee:ejores:v:255:y:2016:i:3:p:699-718) | Có, coi là biết chắc | Thời gian di chuyển phụ thuộc thời điểm | Không | Phân phối thời điểm đến | Không |
| [Avraham & Raviv, 2021](https://engineering.m.tau.ac.il/sites/engineering.tau.ac.il/files/media_server/Engineering/%D7%A9%D7%9E%D7%9C%D7%A6%D7%A8/The-data-driven-time-dependent%20orienteering-problem-with-soft-time-%20windows.pdf) (venue chưa chắc chắn, cần kiểm tra) | Cửa sổ mềm, coi là biết chắc | Thời gian di chuyển, ước lượng từ dữ liệu | Chỉ thời gian di chuyển | Phạt khi vi phạm cửa sổ mềm | Không |
| [Varakantham & Kumar, 2013](https://unicen.smu.edu.sg/sites/unicen.smu.edu.sg/files/downloads/OPLib/Publications/ADT2013-SOP.pdf) | Không | Thời gian di chuyển/phục vụ, so với hạn chót | Không | Ràng buộc cơ hội, giải bằng SAA | Không |
| [Varakantham et al., 2018](https://yeoh-lab.wustl.edu/assets/pdf/tist-VarakanthamKLY18.pdf) | Không | Thời gian di chuyển/chờ | Không | Mục tiêu nhạy rủi ro, SAA, local search | Không |
| [Campbell et al., 2011](https://iro.uiowa.edu/esploro/outputs/journalArticle/The-orienteering-problem-with-stochastic-travel/9984380433402771) | Chỉ hạn chót | Thời gian di chuyển và phục vụ | Không | Thưởng/phạt | Không |
| [Chou et al., 2019](https://doaj.org/article/e2c45fe1d9574ef4a76a75e1788aa71d); POP gốc của Angelelli et al., 2017 | Không | Khả năng phục vụ của từng POI, là đầu vào cho sẵn | Không | Kỳ vọng, Monte Carlo | Không |
| [Kedkaew et al., 2024](https://doaj.org/article/78e5d5f46efb4987abb1e3571f29a7d0) | Chưa kiểm tra | Thời gian di chuyển (xe điện) | Không | Ràng buộc cơ hội | **Có** |
| [Bomboi et al., 2021](https://eldorado.tu-dortmund.de/items/9eea2b84-f80d-49c7-8bf7-cfc0165e3759), [Errico et al., 2018](https://publications.polymtl.ca/41184/1/2018_Errico_Vehicle_Routing_Problem_Hard_Time.pdf) | Có (bài toán VRP), coi là biết chắc | Thời gian di chuyển/phục vụ | Không | Ràng buộc cơ hội trên cửa sổ thời gian | Không áp dụng |
| [Zhao et al., 2012](https://arxiv.org/pdf/1203.0058), [Li et al., 2016](https://arxiv.org/pdf/1505.02463), [Dong et al., 2013](https://research.google.com/pubs/data-fusion-resolving-conflicts-from-multiple-sources/) | Không áp dụng | Các khẳng định mâu thuẫn nhau giữa nguồn | **Có**, nhưng cho dữ liệu tổng quát | Không có bộ lập lịch | Không áp dụng |
| [Foursquare, 2023](https://foursquare.com/resources/blog/news/fsq-places-introducing-our-improved-closed-model) (blog, không bình duyệt) | Không áp dụng | Đóng cửa vĩnh viễn | Có, nhưng mô hình độc quyền | Không | Không áp dụng |

### 1.2 Phần thật sự chưa có (trong phạm vi các bài đã kiểm chứng)

1. **Không có bộ lập lịch nào coi chính giờ mở cửa là bất định.** Mọi bài có cửa sổ thời gian đều coi giờ mở là biết chắc, chỉ thời gian di chuyển hoặc phục vụ là ngẫu nhiên. Đó là [Zhang et al., 2015], [Verbeeck et al., 2016], [Avraham & Raviv, 2021], [Bomboi et al., 2021] và [Errico et al., 2018].
2. **POP/TTDP có xác suất cho từng POI, nhưng xác suất đó là đầu vào cho sẵn.** Một POI chỉ có một xác suất duy nhất, không thay đổi theo khung giờ hay theo thứ trong tuần, và không được ước lượng từ dữ liệu [Chou et al., 2019].
3. **Truth discovery đã cho xác suất trên từng khẳng định và học được độ tin cậy của nguồn** [Zhao et al., 2012; Li et al., 2016]. Nó cũng đã xử lý chuyện nguồn sao chép nhau [Dong et al., 2013]. Tuy nhiên, chưa ai áp dụng cho lịch mở cửa dạng khoảng thời gian theo tuần. Chưa ai dùng xác suất đầu ra để ra quyết định. Chưa ai đánh giá độ hiệu chỉnh của xác suất theo tác động lên lịch trình.
4. **Chưa có đánh giá trên dữ liệu POI thật có nhiều nguồn**, với một nguồn được giữ lại làm đối chứng.

### 1.3 Nói thẳng về điểm yếu

- [Zhang et al., 2015] rất gần về cách đặt bài toán: có ngưỡng xác suất, có khả năng phục vụ của POI, có ở hội nghị data mining. Bài này bắt buộc phải trích dẫn và phân biệt rõ ngay trong phần mở đầu. Điểm khác là **nguồn gốc của sự bất định**: giờ mở cửa so với thời gian di chuyển.
- Nếu bài chỉ ghép một mô hình truth discovery có sẵn với SAA có sẵn, reviewer rất dễ chấm là *incremental*. Phần mới về kỹ thuật phải nằm ở **mô hình ước lượng có cấu trúc thời gian**, và ở **bằng chứng rằng xác suất được hiệu chỉnh tốt làm thay đổi chất lượng lịch trình**.
- Danh sách đã kiểm chứng **chưa phủ** ba mảng sau:
  - VRP/OP với cửa sổ thời gian ngẫu nhiên (*stochastic time windows*);
  - dự đoán giờ mở cửa hoặc tình trạng đóng cửa của POI ở các hội nghị về dữ liệu không gian;
  - truth discovery cho dữ liệu thời gian hoặc dữ liệu dạng khoảng.

  Phải tìm thêm ba mảng này trong tuần 1. Chưa tìm xong thì không được viết "đầu tiên". Nếu đã có bài OR mô hình hóa cửa sổ thời gian ngẫu nhiên, phần lập lịch sẽ kém mới hơn, còn phần ước lượng từ nhiều nguồn vẫn đứng được.

### 1.4 Cách thu hẹp để đóng góp rõ hơn

- **Ba câu hỏi nghiên cứu:**
  - RQ1: Các nguồn ở TP.HCM bất đồng về giờ mở cửa đến mức nào?
  - RQ2: Mô hình có cấu trúc có cho xác suất được hiệu chỉnh tốt hơn các baseline không?
  - RQ3: Lập lịch có tính đến rủi ro giảm tỉ lệ gặp cửa đóng bao nhiêu, và mất bao nhiêu lợi ích?
- **Không đề xuất thuật toán giải mới.** Dùng lại SAA [Varakantham & Kumar, 2013] và local search [Varakantham et al., 2018].
- **Giữ thời gian di chuyển là tất định** để tách riêng tác động của giờ mở cửa. Kết hợp với thời gian di chuyển ngẫu nhiên [Verbeeck et al., 2016] để vào phần hướng phát triển.
- **Giữ bài toán nhiều ngày**, vì giờ mở cửa phụ thuộc vào thứ trong tuần. Việc chọn ngày nào ghé POI nào chính là chỗ xác suất theo khung giờ phát huy tác dụng.
- **Hai phương án xoay nếu dữ liệu mỏng:**
  - (i) Chỉ xét xác suất đóng cửa vĩnh viễn, rồi lập lịch theo xác suất đó.
  - (ii) Dùng dữ liệu bán tổng hợp: dữ liệu thật cộng thêm nhiễu có kiểm soát, với mô hình lỗi học từ tập nhãn vàng.

---

## 2. Ba đóng góp

**C1. Mô hình hóa.**
- Phát biểu bài toán lập lịch tham quan nhiều ngày có cửa sổ thời gian (TOPTW), trong đó chính giờ mở cửa và trạng thái còn hoạt động của mỗi POI là bất định.
- Biến thể thứ nhất đặt ràng buộc cơ hội cho từng lượt ghé. Biến thể này quy được về TOPTW tất định với cửa sổ thời gian suy ra từ xác suất.
- Biến thể thứ hai đặt ràng buộc cho cả hành trình. Khi không có bước xử lý lại (recourse), nó quy về một ràng buộc tài nguyên cộng tính. Khi có recourse, nó được giải bằng SAA.
- Bài không đề xuất thuật toán giải mới.

**C2. Ước lượng.**
- Mô hình truth discovery có cấu trúc cho lịch mở cửa theo tuần, gồm:
  - chuỗi Markov hai trạng thái (mở/đóng) qua các khung giờ;
  - độ nhạy và độ đặc hiệu riêng cho từng nguồn, học không giám sát;
  - trạng thái ẩn "đã đóng cửa vĩnh viễn";
  - prior theo loại POI.
- Đầu ra là xác suất mở cửa cho mỗi bộ POI × ngày × khung giờ. Độ hiệu chỉnh của xác suất được đánh giá riêng.

**C3. Thực nghiệm và dữ liệu.**
- Nghiên cứu trên [N] POI thật ở TP.HCM với [k] nguồn: đo mức bất đồng giữa các nguồn.
- Giao thức đánh giá gồm giữ lại từng nguồn một và một tập nhãn vàng kiểm tra thủ công.
- Kết quả là đường đánh đổi giữa lợi ích và tỉ lệ gặp cửa đóng.
- Công bố mã nguồn và nhãn dựa trên OSM.

Bản nháp tiếng Anh, các chữ trong ngoặc vuông điền sau khi có kết quả:

> 1. We formulate multi-day tourist itinerary planning with time windows in which the opening hours and operating status of each POI are uncertain, and give per-visit and per-tour chance-constrained variants; we show that the former reduces to a deterministic TOPTW with derived windows and the latter to an additive resource constraint without recourse, and solve the recourse case with sample average approximation.
> 2. We propose a structured truth-discovery model for weekly opening-hour schedules that jointly learns source sensitivity and specificity, a slot-level Markov structure and a permanent-closure state, and outputs calibrated per-POI, per-day, per-slot open probabilities.
> 3. On [N] real POIs in Ho Chi Minh City with [k] sources, we quantify source disagreement, evaluate with leave-one-source-out and a manually verified subset, and show that risk-aware plans reduce closed arrivals by [x]% at a utility cost of [y]% relative to single-source and majority-vote baselines; we release code and OSM-based consensus labels.

Câu "to our knowledge, first" chỉ được thêm sau khi đã tìm thêm tài liệu ở tuần 1.

---

## 3. Phương pháp

### 3.1 Biểu diễn dữ liệu

- Mỗi POI có một lưới tuần gồm 7 ngày × 48 ô 30 phút. Nếu dữ liệu thưa thì dùng 24 ô 1 giờ.
- Nguồn s nói về POI p, ngày d, ô t một trong ba giá trị: **mở**, **đóng**, hoặc **không có thông tin**.
- Kèm theo đó là cờ "đã đóng cửa vĩnh viễn" và thời điểm cập nhật của bản ghi, nếu nguồn có cung cấp.

### 3.2 Mô hình xác suất mở cửa

**Biến ẩn:**
- z(p): POI còn hoạt động hay đã đóng cửa vĩnh viễn.
- y(p,d,t): mở hay đóng tại ô t của ngày d.

**Cấu trúc thời gian:** Trong một ngày, y đi theo chuỗi Markov hai trạng thái. Lý do: giờ mở cửa là các khoảng liên tục. Chuỗi Markov loại bỏ được các lịch "lốm đốm" phi thực tế.

**Độ tin cậy nguồn:** Mỗi nguồn có hai tham số, độ nhạy và độ đặc hiệu, tương tự mô hình hai "đồng xu" trong LTM [Zhao et al., 2012]. Độ tin cậy có thể giảm dần theo độ cũ của bản ghi.

**Nguồn sao chép nhau:** Các trang tổng hợp có thể chép lại cùng một giờ đã cũ [Dong et al., 2013]. Tối thiểu cần báo cáo mức tương quan giữa các cặp nguồn. Nếu tương quan cao thì gộp các nguồn đó làm một.

**Prior:** Mỗi loại POI (bảo tàng, chợ, quán cà phê…) có prior riêng, học trên tập POI huấn luyện.

**Suy luận:** Dùng EM. Bước E chạy forward–backward cho từng cặp POI–ngày. Bước M cập nhật tham số của các nguồn.

**Đầu ra:**
- q(p,d,t) = P(POI còn hoạt động) × P(mở tại ô t | dữ liệu).
- r(p,d,a) = P(POI mở trong suốt thời gian tham quan, từ lúc đến a đến a + s_p). Đại lượng này tính chính xác được trên chuỗi Markov.
- Lịch trọn ngày có thể được lấy mẫu từ phân phối hậu nghiệm (forward-filtering backward-sampling) để làm kịch bản cho SAA.

### 3.3 Lập lịch

**Bài toán:** TOPTW nhiều ngày.
- Có D ngày. Mỗi ngày là một tuyến xuất phát từ khách sạn, với ngân sách thời gian T_d.
- Thời gian di chuyển lấy từ ma trận tính trên mạng đường OSM.
- Mỗi POI có lợi ích u_p và thời gian tham quan s_p.

**Biến thể (a), ràng buộc từng lượt ghé.** Chỉ cho phép đến p tại thời điểm a nếu r(p,d,a) ≥ 1 − α. Cách này sinh ra các cửa sổ thời gian suy ra (một POI có thể có nhiều cửa sổ trong một ngày), rồi giải như TOPTW tất định.

**Biến thể (b1), ràng buộc cả ngày, không recourse.** Yêu cầu P(mọi lượt ghé trong ngày đều gặp cửa mở) ≥ 1 − β.
- Với tham số nguồn cố định, các POI độc lập có điều kiện, nên ràng buộc trở thành Σ −log r ≤ −log(1 − β). Đây là một ràng buộc tài nguyên cộng tính.
- Nhận xét này đơn giản nhưng đáng viết vào bài.
- Có thể dùng mục tiêu kỳ vọng thay cho ràng buộc: max Σ u_p·r_p − λ·E[thời gian di chuyển bị phí].

**Biến thể (b2), có recourse.** Đến nơi thấy đóng cửa thì đi tiếp ngay, nên thời điểm đến các điểm sau bị dịch. Trường hợp có tương quan giữa các POI (ví dụ ngày lễ) cũng xếp vào đây. Giải bằng SAA trên K kịch bản lấy mẫu [Varakantham & Kumar, 2013], kết hợp local search như [Varakantham et al., 2018].

### 3.4 Baseline

**Phần hợp nhất dữ liệu:**
- B1: Dùng một nguồn duy nhất. Chạy riêng với từng nguồn, đặc biệt là OSM.
- B2: Bỏ phiếu đa số theo từng ô.
- B3: Hợp giờ: mở nếu có bất kỳ nguồn nào nói mở. Đây là cách lạc quan.
- B4: Giao giờ: mở chỉ khi mọi nguồn có thông tin đều nói mở. Đây là cách bi quan.
- B5: Lấy nguồn có bản ghi mới nhất, nếu có thời điểm cập nhật.
- B6 (ablation): Truth discovery không cấu trúc, tức các ô độc lập nhau và không có prior.

**Phần lập lịch:**
- TOPTW tất định trên giờ của từng baseline.
- TOPTW tất định trên giờ có xác suất cao nhất (MAP) của chính mô hình đề xuất. Ablation này rất quan trọng. Nó tách được hai phần đóng góp: phần đến từ việc hợp nhất dữ liệu tốt hơn, và phần đến từ việc dùng xác suất thay cho một giá trị chắc chắn.
- Các biến thể (a), (b1) và (b2).

### 3.5 Metric

**Phần hợp nhất dữ liệu:**
- Độ chính xác theo ô.
- F1 cho lớp "đóng".
- Brier score và ECE để đo độ hiệu chỉnh.
- AUC cho việc phát hiện POI đã đóng cửa vĩnh viễn.

**Phần lập lịch:** Mô phỏng việc đi theo lịch trình, với "thực tế" là nguồn được giữ lại hoặc tập nhãn vàng.
- Tỉ lệ lượt đến gặp cửa đóng (metric chính).
- Tỉ lệ ngày có ít nhất một lần gặp cửa đóng.
- Lợi ích thực nhận, chỉ cộng các POI thực sự mở, đặt cạnh lợi ích theo kế hoạch.
- Thời gian chờ mở cửa.
- Thời gian di chuyển bị phí.
- Số POI được ghé.
- Thời gian chạy.

### 3.6 Giao thức đánh giá

**Giữ lại một nguồn:**
- Lần lượt giữ lại nguồn h. Hợp nhất từ các nguồn còn lại.
- So sánh xác suất dự đoán với khẳng định của h, chỉ trên những ô mà h có thông tin.
- Lập lịch bằng dữ liệu đã hợp nhất, rồi mô phỏng chuyến đi với giờ của h làm thực tế.
- Phải ghi rõ trong bài: cách này đo **mức đồng thuận với một nguồn độc lập**, không đo sự thật.

**Tập nhãn vàng:**
- Kiểm tra thủ công 100–150 POI bằng cách gọi điện hoặc đến tận nơi, ghi lại ngày kiểm tra.
- Đây là con số đáng tin nhất. Báo cáo tách riêng.

**Truy vấn:**
- Khoảng 200 truy vấn, khác nhau ở điểm xuất phát, số ngày (1–3), ngày bắt đầu trong tuần và sở thích theo loại POI.
- Mọi phương pháp chạy trên cùng bộ truy vấn.
- Kiểm định cặp Wilcoxon và khoảng tin cậy bootstrap.

**Chống rò rỉ dữ liệu:**
- Chia POI thành tập train và test để học prior theo loại.
- Tham số của các nguồn không được học từ nguồn đang giữ lại.

### 3.7 Phân tích độ nhạy

- Quét α và β để vẽ đường Pareto giữa lợi ích và tỉ lệ gặp cửa đóng.
- Số nguồn còn lại, từ 1 đến k.
- Thêm nhiễu nhân tạo vào một nguồn.
- Độ mịn của ô: 30 phút so với 60 phút.
- Số kịch bản K trong SAA.
- Độ dài chuyến đi: 1–3 ngày.
- Độ mạnh của prior.

---

## 4. Dữ liệu và giấy phép

Mục này không phải tư vấn pháp lý. Nên hỏi thầy hướng dẫn hoặc trường trước khi công bố.

**Quy định theo từng nguồn:**

| Nguồn | Dùng trong nghiên cứu | Công bố lại |
|---|---|---|
| OpenStreetMap | Được, theo ODbL 1.0, ghi "© OpenStreetMap contributors" | Được. Cơ sở dữ liệu dẫn xuất được công bố phải theo ODbL (share-alike) |
| HERE | Theo điều khoản tài khoản. Kiểm tra điều khoản lưu trữ và dùng cho nghiên cứu | **Không** công bố giá trị thô hay bản sao |
| Google | Không scrape. Chỉ dùng API chính thức, đúng điều khoản lưu trữ. Nếu không chắc được phép thì nên bỏ khỏi pipeline | **Không** |
| Website của địa điểm | Tôn trọng robots.txt và điều khoản. Chỉ lấy giờ mở cửa | Chỉ công bố nhãn đã suy ra, không công bố nội dung trang |
| Trang review | Kiểm tra điều khoản, đa số cấm scrape. Không lấy nội dung đánh giá | **Không** |

**Những gì công bố:**
1. Mã nguồn, kèm hướng dẫn để người khác tự chạy lại bằng khóa API của mình.
2. Bảng theo OSM ID, cấp phép ODbL, gồm: nhãn đồng thuận, xác suất mở theo từng ô, và nhãn vàng kiểm tra thủ công. Nhãn vàng là dữ liệu do bạn tự thu thập.
3. Thống kê tổng hợp: tỉ lệ bất đồng theo từng cặp nguồn và theo loại POI, mức độ phủ của từng nguồn.

**Lưu ý:**
- Nhãn đồng thuận vẫn được suy ra một phần từ dữ liệu HERE/Google. Cần kiểm tra điều khoản của hai nguồn này về dữ liệu dẫn xuất.
- Phương án an toàn: bảng công bố chỉ chứa nhãn suy ra từ OSM, website và nhãn vàng. Các kết quả có dùng HERE/Google chỉ xuất hiện dưới dạng thống kê trong bài.
- Bản nộp double-blind cần một kho mã ẩn danh.

---

## 5. Hội nghị phù hợp

Rank lấy theo CORE2023 và đã được kiểm tra trên portal. Portal hiện đã có ICORE2026, cần kiểm tra lại rank trước khi chốt. Tính đến hôm nay, 19/11/2026:

| Hội nghị | Rank | Hạn nộp gần nhất | Hạn đã xác nhận? | Giới hạn trang | Độ phù hợp | Khả thi với kế hoạch 8–10 tuần |
|---|---|---|---|---|---|---|
| [MDM](https://portal.core.edu.au/conf-ranks/1133/) | B | MDM 2027 chưa có call. Hạn MDM 2026 là 6/3/2026, nên dự kiến khoảng 1–3/2027 | **Chưa** | 10 trang (bài ngắn 6), không tính tài liệu tham khảo (theo call 2026) | Rất cao: LBS, POI, dữ liệu không gian bất định | **Mục tiêu chính** |
| [SSTD](https://portal.core.edu.au/conf-ranks/1416/) | B | Thường tổ chức 2 năm một lần. Lần gần nhất hạn 4/5/2025, nên có thể có kỳ 2027 với hạn vào mùa xuân | **Chưa** | 10 trang (bài ngắn 4), không tính tài liệu tham khảo, ACM (theo call 2025) | Cao: bất định không gian–thời gian | Dự phòng 1 |
| [PRICAI](https://portal.core.edu.au/conf-ranks/1661/) | B | Khoảng 6/2027. Kỳ 2026 hạn 13/6, gia hạn đến 27/6 | **Chưa** | 12–16 trang, tính cả tài liệu tham khảo | Khá: lập lịch có ràng buộc xác suất | Dự phòng 2 |
| [WISE](https://portal.core.edu.au/conf-ranks/1271/) | B | Khoảng 6/2027. Kỳ 2026 hạn 17/6 | **Chưa** | Chưa rõ (thường là LNCS) | Khá: độ tin cậy dữ liệu web | Dự phòng 2 |
| [ICTAI](https://portal.core.edu.au/conf-ranks/1251/) | B | Khoảng giữa 2027. Kỳ 2026 hạn 30/6 | **Chưa** | 8 trang tính tất cả, double-blind | Trung bình | Dự phòng 3, rất chật trang |
| [PAKDD](https://portal.core.edu.au/conf-ranks/1667/) | B (có ghi chú "See note") | 20/11/2026, theo CFP trên EasyChair | **Chưa**, site chính thức không ghi hạn | 12 trang tính tất cả, LNCS, double-blind | Rất cao | Không kịp (ngày mai) |
| [DASFAA](https://portal.core.edu.au/conf-ranks/988/) | B | 22 hoặc 25/11/2026, theo trang bên thứ ba | **Chưa** | 16 trang (theo call 2026) | Cao | Không kịp |
| [CPAIOR](https://portal.core.edu.au/conf-ranks/1090/) | B | Tóm tắt 1/12/2026, bài đầy đủ 7/12/2026, theo trang bên thứ ba | **Chưa** | Chưa rõ | Khá, nhưng chỉ ở phần tối ưu | Không kịp |
| [ACIIDS](https://portal.core.edu.au/conf-ranks/2188/) | B (portal có 133 bình luận, nên đọc) | 14/11/2026 (đã gia hạn) | **Đã xác nhận** trên trang chính thức | 12–15 trang, LNAI | Trung bình | Đã qua hạn |

**Khuyến nghị:** Hoàn thành bản thảo trước cuối tháng 1/2027 để nhắm MDM 2027. Theo dõi trang MDM 2027 từ tháng 12. Nếu MDM có hạn quá sớm hoặc bài bị từ chối, chuyển sang SSTD 2027 (nếu có), sau đó là PRICAI hoặc WISE 2027.

---

## 6. Kế hoạch 10 tuần đến bản nộp (23/11/2026 – 31/1/2027)

| Tuần | Thời gian | Công việc | Mốc / điều kiện |
|---|---|---|---|
| 1 | 23–29/11 | Tìm thêm tài liệu: stochastic time windows, dự đoán giờ mở và tình trạng đóng cửa POI, truth discovery cho dữ liệu thời gian. Đo độ phủ: bao nhiêu POI có giờ từ ít nhất 2 nguồn. Kiểm tra điều khoản HERE, Google và các trang review | **Điều kiện đi tiếp:** đủ POI có nhiều nguồn và mức bất đồng đủ lớn (ngưỡng cụ thể chốt với thầy). Nếu không đạt thì xoay hướng theo mục 1.4 |
| 2 | 30/11–6/12 | Chuyển giờ của mọi nguồn sang lưới tuần. Ghép POI giữa các nguồn theo tên và khoảng cách. Thống kê bất đồng (trả lời RQ1) | Có hình và bảng cho RQ1 |
| 3 | 7–13/12 | Kiểm tra thủ công 100–150 POI để làm tập nhãn vàng. Cài đặt các baseline hợp nhất B1–B5 | Có tập nhãn vàng |
| 4 | 14–20/12 | Cài đặt mô hình có cấu trúc với EM. Đo độ hiệu chỉnh. Chạy ablation B6 | **Điều kiện đi tiếp:** Brier/ECE tốt hơn bỏ phiếu đa số |
| 5 | 21–27/12 | Tính ma trận thời gian di chuyển. TOPTW tất định bằng local search. Cài đặt biến thể (a) | Bộ lập lịch chạy được |
| 6 | 28/12–3/1 | Cài đặt biến thể (b1), rồi (b2) bằng SAA. Viết bộ sinh truy vấn | Đủ các phương pháp |
| 7 | 4–10/1 | Chạy thí nghiệm chính: giữ lại từng nguồn và đánh giá trên tập nhãn vàng (RQ2, RQ3) | Có kết quả chính |
| 8 | 11–17/1 | Phân tích độ nhạy, kiểm định thống kê, vẽ hình | Đủ hình và bảng |
| 9 | 18–24/1 | Viết bản thảo đầy đủ. Viết phần related work dựa trên bảng ở mục 1.1 | Có bản nháp v1 |
| 10 | 25–31/1 | Thầy góp ý, sửa bài. Ẩn danh bản nộp và kho mã. Kiểm tra lại call và rank (ICORE2026) | Sẵn sàng nộp, trước Tết (đầu tháng 2/2027) |

**Nếu chỉ có 8 tuần:**
- Bỏ biến thể (b2) và chỉ giữ (a) và (b1).
- Thu nhỏ tập nhãn vàng còn khoảng 80 POI.
- Gộp việc viết bài vào tuần 7–8.

Nếu MDM 2027 có hạn vào khoảng đầu tháng 3 như kỳ trước, kế hoạch này còn dư khoảng một tháng.

---

## Tài liệu tham khảo

Chỉ gồm các bài đã kiểm chứng. Các mục có đánh dấu cần kiểm tra lại trước khi trích dẫn.

- Zhang, Liang, Wang, Sun (2015). *Personalized Trip Recommendation with POI Availability and Uncertain Traveling Time.* CIKM 2015. https://www2.cs.sfu.ca/~wangk/pub/TripRec.pdf (bản mở rộng ở ACM TIST, DOI 10.1145/2948065)
- Varakantham, Kumar, Lau, Yeoh (2018). *Risk-Sensitive Stochastic Orienteering Problems for Trip Optimization in Urban Environments.* ACM TIST 9(3). https://yeoh-lab.wustl.edu/assets/pdf/tist-VarakanthamKLY18.pdf
- Varakantham, Kumar (2013). *Optimization Approaches for Solving Chance Constrained Stochastic Orienteering Problems.* ADT 2013, LNCS 8176. https://unicen.smu.edu.sg/sites/unicen.smu.edu.sg/files/downloads/OPLib/Publications/ADT2013-SOP.pdf
- Verbeeck, Vansteenwegen, Aghezzaf (2016). *Solving the stochastic time-dependent orienteering problem with time windows.* EJOR 255(3). https://econpapers.repec.org/RePEc:eee:ejores:v:255:y:2016:i:3:p:699-718
- Campbell, Gendreau, Thomas (2011). *The orienteering problem with stochastic travel and service times.* Annals of OR 186(1). https://iro.uiowa.edu/esploro/outputs/journalArticle/The-orienteering-problem-with-stochastic-travel/9984380433402771
- Chou, Gambardella, Montemanni (2019). Probabilistic orienteering applied to tourist trip design. https://doaj.org/article/e2c45fe1d9574ef4a76a75e1788aa71d **Cần kiểm tra:** tên bài và venue. Bài POP gốc của Angelelli et al. (2017, Computers & Operations Research) chưa có link đã kiểm chứng.
- Bomboi, Buchheim, Pruente (2021). *On the Stochastic Vehicle Routing Problem with time windows, correlated travel times, and time dependency.* https://eldorado.tu-dortmund.de/items/9eea2b84-f80d-49c7-8bf7-cfc0165e3759
- Errico, Desaulniers, Gendreau, Rei, Rousseau (2018). *Vehicle Routing Problem with Hard Time Windows and Stochastic Service Times.* EURO J. Transportation and Logistics. https://publications.polymtl.ca/41184/1/2018_Errico_Vehicle_Routing_Problem_Hard_Time.pdf
- Avraham, Raviv (2021). *The data-driven time-dependent orienteering problem with soft time windows.* https://engineering.m.tau.ac.il/sites/engineering.tau.ac.il/files/media_server/Engineering/%D7%A9%D7%9E%D7%9C%D7%A6%D7%A8/The-data-driven-time-dependent%20orienteering-problem-with-soft-time-%20windows.pdf **Cần kiểm tra:** venue (Transportation Science?).
- Li, Gao, Meng, Li, Su, Zhao, Fan, Han (2016). *A Survey on Truth Discovery.* SIGKDD Explorations 17(2). https://arxiv.org/pdf/1505.02463
- Dong, Berti-Equille, Srivastava (2013). *Data Fusion: Resolving Conflicts from Multiple Sources.* WAIM 2013. https://research.google.com/pubs/data-fusion-resolving-conflicts-from-multiple-sources/
- Zhao, Rubinstein, Gemmell, Han (2012). *A Bayesian Approach to Discovering Truth from Conflicting Sources for Data Integration.* PVLDB 5(6). https://arxiv.org/pdf/1203.0058
- Kedkaew et al. (2024). Multi-day tourist trip design for battery electric vehicles with chance-constraint programming. Mathematics (MDPI). https://doaj.org/article/78e5d5f46efb4987abb1e3571f29a7d0 **Cần kiểm tra:** tên bài.
- Foursquare (2023). *FSQ Places: Introducing our improved Closed model.* Blog doanh nghiệp, không bình duyệt; chỉ dùng để nêu động cơ của bài. https://foursquare.com/resources/blog/news/fsq-places-introducing-our-improved-closed-model
