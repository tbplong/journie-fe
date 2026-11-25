# Cổng tuần 1 cho G01: sửa lịch trình trong ngày sao cho ít thay đổi nhất

**Kết luận: THU HẸP.** Tiếp tục G01, chưa đổi sang G14, nhưng phát biểu đóng góp phải hẹp hơn bản trong `/Users/quocduy276/Uni/Y4/ĐACN/journie-fe-main/docs/gap-ranking-verified.md`. Kết luận có điều kiện: còn phải tìm tay trên DBLP và Google Scholar, vì lượt này không truy vấn tự động được hai nơi đó.

**Về câu của bạn.** Đúng, G01 chính là bài toán thích ứng chuyến đi mà Journie đang giải ở `replanDay` (`/Users/quocduy276/Uni/Y4/ĐACN/journie-fe-main/src/domain/replan.ts`). Mã hiện tại tối đa "lợi ích trừ λ nhân chi phí thay đổi", chỉ xét 4 điểm mới và cắt ở 300.000 nút. Trong bài báo nó là một baseline, còn phần nghiên cứu là một phương pháp có bảo đảm thay cho nó.

## 1. Kết luận cổng tuần 1

### Vì sao không đổi sang G14
- Điều kiện đổi hướng là "đã có bài tối ưu số thay đổi cho orienteering có khung giờ (OPTW)". Không tìm thấy bài nào như vậy.
- Lượt này tìm thêm: 16 truy vấn boolean trên OpenAlex (tiêu đề và tóm tắt), 3 truy vấn web tìm bài mới, 7 truy vấn tra cứu, khoảng 10 tóm tắt.
- Yuan et al. tự viết rằng mục tiêu ít phép sửa nhất "is neither an objective implemented by all methods nor a guarantee of globally minimum-edit repair". Phần hạn chế ghi "no method is shown to return globally minimum-edit P*". Tôi đã dò hai câu này trực tiếp trên văn bản HTML của bài.

### Vì sao phải thu hẹp
1. **Dạng hàm phạt không phải đóng góp.** Nếu chỉ phạt bỏ và thêm thì U(π) − λ·(w_D·|R \ π| + w_A·|π \ R|) bằng một bài OPTW thường. Điểm cũ có lợi ích p_i + λ·w_D, điểm mới có p_i − λ·w_A, cộng một hằng số. Bộ giải OPTW nào cũng giải được.
2. **Phạt lệch giờ đã có người làm.** Vogler, Meunier, Bierlaire (STRC 5/2026) có mô hình và thuật toán gán nhãn chính xác cho bài chọn hoạt động có giờ mở cửa và phạt lệch khỏi một lịch tham chiếu. Pan & Mao (2024) có ràng buộc "lệch giờ đến không quá T" trong một bài orienteering có điểm bắt buộc.
3. **"Bảo đảm khoảng cách nhỏ nhất tới kế hoạch cũ" đã có trong lập kế hoạch cổ điển** (Saetti & Scala, ICAPS 2022; KER 2025). Không được viết "phương pháp đầu tiên có bảo đảm" mà thiếu phạm vi.
4. **Đóng một điểm gần như hiển nhiên**, như tài liệu xếp hạng đã ghi. Trọng tâm phải là trễ và mưa.

### Phần còn mở sau khi thu hẹp
Chưa thấy bài nào tính đường biên chính xác "lợi ích lớn nhất với tối đa k phép sửa" cho lịch một ngày đang đi dở, với đủ các yếu tố sau:
- khung giờ nhiều khoảng;
- phép sửa rời rạc, gồm cả đổi thứ tự;
- sự cố lan (trễ, mưa);
- chứng nhận tối ưu và trả lời dưới 1 giây.

### Mức đọc từng bài

| Bài | Mức đọc | Có tối ưu số thay đổi cho OPTW không |
|---|---|---|
| Yuan et al. 2026, arXiv 2609.19654, chưa bình duyệt | Toàn văn HTML qua bước trích tự động. Lượt này tải HTML gốc (khoảng 44 nghìn ký tự chữ) và dò trực tiếp các câu, số then chốt | Không. Độ ổn định chỉ đo sau; không có giờ mở cửa; không mô phỏng phần chuyến đã đi |
| TripTide, arXiv 2510.21329, Findings of ACL 2026 | Khoảng 100/107 nghìn ký tự bản arXiv v1, qua bước trích tự động; chưa so bản ACL | Không. Benchmark cho LLM, không có thuật toán sửa |
| Le, Middendorf, Shi 2022 | Khoảng 100/140 nghìn ký tự, qua bước trích tự động | Không. Không khung giờ, không phạt thay đổi |
| Zhai & Awasthi 2025, blog Google | Cả bài blog; không có bài báo | Một phần: thưởng độ giống bản nháp của LLM, trước chuyến, không số liệu |
| iTIMO, SIGIR 2026 | Khoảng 100/110 nghìn ký tự, qua bước trích tự động | Không. Không mô hình thời gian |
| Pan & Mao 2024, arXiv 2402.07662 (mới) | Khoảng 100/105 nghìn ký tự, qua bước trích tự động | Gần nhất phía vận trù. Lệch giờ đến là ràng buộc cứng; khách cũ không được bỏ; không khung giờ; heuristic, Gurobi cho ca nhỏ; không đường biên |
| Vogler, Meunier, Bierlaire, STRC 5/2026 (mới) | Slide 1-21/29 xem trực tiếp; không tìm thấy bài viết | Không đếm phép sửa. Lịch tham chiếu là lịch ưa thích, không phải lịch bị sự cố. Ca 20 đỉnh mất 0,6-94 giây |
| Saetti & Scala, ICAPS 2022 và KER 2025 (mới) | Tóm tắt và đoạn trích | Có bảo đảm khoảng cách nhỏ nhất, nhưng cho lập kế hoạch cổ điển |
| Sörensen 2006; bài xe chở gỗ arXiv 2607.20901; Wu et al. 1993; Pillac et al. 2012; Wang et al. 2023; Lau et al. 2012; arXiv 2303.15558 | Chỉ tóm tắt hoặc đoạn trích | Phạt hoặc giới hạn thay đổi có ở định tuyến xe và lập lịch máy, không ở OPTW |
| Demange et al. 2021; Yalcin et al. 2023; IGAPR 2024; ROAM 11/2026; TravelGenie 2026 (mới) | Chỉ tóm tắt | Không |
| Li & Choi 2026, bản thảo Preprints.org (mới) | Chỉ đoạn trích kết quả tìm; trang trả lỗi 403 | Chưa rõ. Có đổi tuyến theo thời tiết bằng GA; phải đọc tay |

### Giới hạn của lượt kiểm
- **DBLP:** API trả về trang kiểm tra bot. Tôi không vượt qua, nên không có kết quả DBLP.
- **Google Scholar:** không truy vấn.
- **OpenAlex:** giới hạn tần suất; tôi chờ đúng thời gian máy chủ yêu cầu rồi chạy lại.
- Yêu cầu "tìm trực tiếp trên DBLP và Google Scholar" của cổng tuần 1 vì vậy chưa xong. Đây là việc đầu tiên của tuần 2.
- Mảng này ra bài rất nhanh: ROAM xuất hiện ngày 6/11/2026.

## 2. Phát biểu bài toán

### Dữ liệu
- **V:** tập POI. Mỗi i có lợi ích p_i > 0, thời lượng d_i, cờ ngoài trời o_i, và các khoảng mở cửa trong ngày W_i = {[a_i^1, b_i^1], ..., [a_i^q, b_i^q]}, rời nhau. Lượt ghé [s_i, s_i + d_i] phải nằm trọn trong một khoảng.
- **t(i, j):** thời gian đi. **T:** giờ kết thúc ngày.
- **Lịch gốc** đã chấp nhận π⁰ = (v_1, ..., v_n) với giờ bắt đầu s⁰.
- **Thời điểm hiện tại τ.** Các điểm đã xong hoặc đang ghé v_1..v_c bị đóng băng. Người đi rảnh tại vị trí u₀ lúc τ₀ = max(τ, giờ kết thúc v_c).
- **Phần còn lại** R = (r_1, ..., r_m). L ⊆ R là các điểm khoá. C là tập ứng viên thêm mới: chưa ghé, không thuộc ngày khác, không bị loại.

### Sự cố
Mỗi sự cố là một phép biến đổi (τ₀, W, t) thành (τ₀', W', t').

| Sự cố | Biến đổi | Vì sao lan |
|---|---|---|
| Trễ Δ phút | τ₀' = τ₀ + Δ | Mọi điểm sau lùi Δ. Một điểm trượt qua giờ nghỉ trưa hoặc giờ đóng cửa kéo theo các điểm sau |
| Mưa trong [ρ₁, ρ₂) | Với mọi i ngoài trời: W'_i = W_i trừ [ρ₁, ρ₂) | Một khoảng bị cắt thành hai. Nhiều điểm hỏng cùng lúc. Đổi thứ tự có thể cứu mà không mất điểm nào |
| Đóng cửa đột xuất điểm c trong [κ₁, κ₂) | W'_c = W_c trừ [κ₁, κ₂) | Nếu c hết khoảng thì bắt buộc mất một phép sửa; báo riêng số phép sửa bắt buộc |
| Kẹt xe (tuỳ chọn) | t' = γ·t trong một khoảng giờ | Dồn dần theo từng chặng |

Mưa ở đây chặt hơn Journie: cấm cả lượt ghé chạm khoảng mưa, không chỉ cấm bắt đầu trong mưa.

### Lịch mới và ràng buộc
Lịch mới π = (x_1, ..., x_ℓ) với giờ bắt đầu s, mỗi x_j thuộc R ∪ C và xuất hiện nhiều nhất một lần.
1. s_1 ≥ τ₀' + t'(u₀, x_1).
2. s_{j+1} ≥ s_j + d(x_j) + t'(x_j, x_{j+1}); được phép chờ.
3. Mỗi lượt ghé nằm trọn trong một khoảng của W'.
4. Lượt cuối kết thúc trước T (cộng thời gian về điểm cuối nếu có).
5. L ⊆ π.
6. Tuỳ chọn: ngân sách, số bữa ăn.
7. Yêu cầu hệ thống: trả lời dưới 1 giây.

### Độ đo thay đổi D(π, R)
D là chi phí nhỏ nhất của dãy phép sửa biến R thành π.
- **Bốn phép:** bỏ (w_D), thêm (w_A), thay tại chỗ (w_S), đổi chỗ một điểm giữ lại (w_M). Mặc định mọi trọng số bằng 1.
- **Công thức** khi không tính riêng phép thay: D = w_D·|R \ π| + w_A·|π \ R| + w_M·(|R ∩ π| − LCS(R, π)). LCS là dãy con chung dài nhất. Tính được trong O(m·ℓ).
- **Phép thay** gộp một bỏ và một thêm trong cùng một khe thành một phép. Cách này khớp với Yuan et al., nơi số sửa điểm tham quan trong ngày là max(số bỏ, số thêm).
- **Biến thể:** trọng số theo vị trí, đổi điểm kế tiếp đắt hơn đổi điểm cuối ngày.
- **Lệch giờ không tính là phép sửa.** Khi trễ thì mọi điểm đều lệch, và phạt lệch giờ là vùng của Vogler et al. Lệch giờ được báo riêng (tổng phút lệch) và dùng để phá hoà.

### Mục tiêu
- **Lợi ích:** U(π) = tổng p_i, cùng hàm điểm với lúc lập lịch gốc.
- **Đường biên:** F(k) = max U(π) với π khả thi sau sự cố và D(π, R) ≤ k, cho k = 0, 1, ..., K.
- **Đầu ra:** với mỗi k một lịch π_k kèm chứng nhận tối ưu; k_min là k nhỏ nhất có lời giải; U* = F(∞) là tối ưu lại toàn bộ.
- **Dạng hàm phạt** max U(π) − λ·D(π, R) chỉ là baseline.

Bài toán nghiên cứu bỏ ràng buộc chờ tối đa 75 phút và các số hạng phạt đi, chờ, thưởng bữa ăn của Journie. Giữ chúng thì "đến sớm hơn luôn tốt hơn" không còn đúng.

### Vì sao khó
- **Chứa OPTW,** nên NP-khó khi k không bị chặn. Với k cố định thì đa thức: số lịch trong k phép sửa cỡ (m·|C| + m²)^k. Con số này vẫn quá lớn để duyệt hết khi |C| là vài trăm và k = 3.
- **Chỗ sửa rẻ nhất không nằm ở điểm hỏng.** Ví dụ R = (A, B, C) với lợi ích 3, 8, 6. Trễ 30 phút làm B quá giờ đóng cửa. Bỏ B còn 9; bỏ A (điểm rẻ ở phía trước) còn 14. Cả hai đều là một phép sửa.
- **Đường biên không lõm.** Quét λ chỉ tìm được các điểm trên bao lõm. Một lịch 1 phép sửa có thể không bao giờ hiện ra, dù nó là tốt nhất với k = 1.
- **Đổi thứ tự không tách theo từng điểm,** nên không đưa được về bài OPTW đổi điểm số.
- **Chứng nhận "ít nhất"** đòi loại trừ mọi lịch có ít phép sửa hơn.

## 3. Hướng giải

### H1: gán nhãn theo ngân sách phép sửa, neo theo lịch gốc
- **Ý tưởng:** mọi lịch trong k phép sửa giữ ít nhất m − k điểm cũ đúng thứ tự.
- **Nhãn:** chỉ số điểm cũ đúng chỗ gần nhất, điểm vừa ghé, số phép sửa đã dùng, tập ngoại lệ (tối đa k phần tử: điểm mới đã chèn, điểm cũ bị bỏ qua hoặc chuyển chỗ). Giá trị là (lợi ích, giờ rảnh sớm nhất).
- **Luật trội:** cùng trạng thái, ít phép sửa hơn, lợi ích không kém, giờ không muộn hơn.
- **Xử lý theo lớp** số phép sửa tăng dần. Xong lớp e thì F(e) đã được chứng nhận, nên hết thời gian vẫn có đáp án đúng cho các k nhỏ.
- **Một lần chạy cho cả đường biên.** Tính xong một lần thì thanh trượt chỉ tra bảng, không giải lại mỗi bước như hiện nay.

### H2: MIP hoặc CP-SAT với ràng buộc D ≤ k, giải cho từng k
- Biến chọn điểm y_i, biến "giữ đúng thứ tự" g_i, giờ bắt đầu, chọn khoảng mở cửa.
- Ràng buộc: tổng (1 − y_i) trên điểm cũ + tổng y_i trên điểm mới + tổng (y_i − g_i) ≤ k. Hai điểm cũ cùng có g = 1 phải giữ thứ tự cũ.
- Đây là ràng buộc kiểu local branching (Fischetti & Lodi 2003, theo trí nhớ) cộng thêm thứ tự.

### H3: vá theo độ dư thời gian, rồi tìm kiếm lân cận có phạt thay đổi
- Lân cận là chính các phép sửa, xuất phát từ lịch gốc.
- Không có bảo đảm. Sai số đo bằng chặn trên lấy từ H1 chạy trên không gian trạng thái nới lỏng, hoặc từ U*.

### So sánh

| Tiêu chí | H1 | H2 | H3 |
|---|---|---|---|
| Bảo đảm | Tối ưu cho mọi k ≤ K, một lần chạy | Tối ưu từng k, bộ giải chứng minh | Không; đo sai số bằng chặn trên |
| Thời gian (ước lượng, chưa đo) | Mili giây đến vài chục mili giây | 0,1-10 giây mỗi k | Dưới vài mili giây |
| Mở rộng | Tốt khi k nhỏ; ca xấu tăng theo (m·\|C\|)^k | Ca lớn; dễ thêm ràng buộc phụ | Nhiều ngày, ca rất lớn |
| Rủi ro | Bị coi là "thêm một tài nguyên vào gán nhãn" | Chậm, phụ thuộc bộ giải | Không có bảo đảm |
| Vai trò | Đóng góp chính | Mốc chính xác để kiểm H1 | Baseline mạnh và phương án nhanh |

### Chọn H1
- Phần còn lại của một ngày chỉ 3-8 điểm, nên giải chính xác là vừa sức.
- Chứng nhận cho từng k là đúng thứ Yuan et al. nói chưa ai có.
- H1 khai thác cấu trúc neo theo lịch gốc. Gán nhãn tổng quát của Vogler et al. mất hàng giây ở 20 đỉnh, dù đó là bài toán khác.
- H2 làm trước để có mốc. H1 phải khớp H2 trên mọi ca thử.
- Hàng xóm phải trích: lân cận Balas-Simonetti (2001), tối ưu gia tăng (Şeref, Ahuja, Orlin 2009), Nebel & Koehler (1995). Ba bài này tôi mới xác nhận ở mức thư mục.

## 4. Thiết kế thí nghiệm

### Benchmark OPTW chuẩn
- **Nguồn:** thư viện OPLib (SMU). Nhóm Solomon 56 ca, mỗi ca 100 điểm; nhóm Cordeau 20 ca, 48-288 điểm. Số ca lấy từ đoạn trích, cần đếm lại khi tải.
- **Lịch gốc:** lời giải tốt nhất đã biết hoặc lời giải ILS, một tuyến.
- **Cắt** tại 25%, 50%, 75% thời lượng của lịch.
- **Sự cố:**
  - trễ 2,5%, 5%, 10% chân trời thời gian;
  - mưa bắt đầu tại τ, dài 5%, 10%, 20% chân trời;
  - đóng điểm kế tiếp hoặc điểm lợi ích cao nhất còn lại;
  - trễ cộng mưa.
- **Cờ ngoài trời** gán giả lập cho 30% điểm theo hạt giống cố định, ghi rõ trong bài.
- **Quy mô:** khoảng 76 × 3 × 10 = 2.280 ca. Công bố bộ sinh và hạt giống.

### Dữ liệu TP.HCM
Tôi đã xem tệp `/Users/quocduy276/journie-be/data/places_1000.parquet`:
- 1.000 điểm, trong đó 707 là nhà hàng và quán cà phê.
- 894 điểm có giờ mở cửa; khoảng 44 điểm có hai khoảng trong ngày.
- Không điểm nào có thời lượng tham quan, nên phải dùng mức theo loại.

**Cờ ngoài trời hiện sai.** Ánh xạ theo loại trong `poiFromCard.ts` coi 258 điểm là ngoài trời, gồm 61 quán bar, 25 quán karaoke, 77 chùa, 29 nhà thờ. Điểm thật sự lộ thiên chỉ khoảng 37-59. Phải kiểm tay khoảng 290 điểm không phải ăn uống trước khi chạy kịch bản mưa.

**Thiết lập:**
- Lịch gốc: 300-500 lịch-ngày cho khách mô phỏng (sở thích × điểm xuất phát × nhịp độ), lập bằng bộ giải của backend hoặc ILS.
- Thời gian đi: OSRM. Nếu không có thì khoảng cách nhân hệ số, ghi rõ.
- Mưa thật theo giờ: chuỗi lượng mưa theo giờ của TP.HCM, mùa mưa 2023-2025. Nguồn đề xuất là trạm Tân Sơn Nhất và dữ liệu tái phân tích; cả hai chưa kiểm trong lượt này.
- Giờ có mưa trên ngưỡng là giờ mưa. Chọn ngưỡng trước, rồi thử độ nhạy, ví dụ 1; 2,5; 7,6 mm/giờ.
- Báo cáo tỉ lệ lịch-ngày thật sự bị mưa chạm vào.

### Baseline
1. Bỏ điểm bị lỡ rồi đi tiếp, không thêm.
2. Xếp lại từ đầu, không phạt (chính xác). Cho U* và số phép sửa của nó.
3. Xếp lại có phạt λ, tức OPTW đổi điểm số; quét một lưới λ.
4. Heuristic hiện tại của Journie (`replanDay`), chạy với cùng hàm điểm.
5. VNS động kiểu Le et al. thêm khung giờ. Đây là bản tự cài theo mô tả trong bài.
6. LLM sửa lịch, nếu khả thi:
   - mẫu 200 ca, một mô hình cố định phiên bản, nhiệt độ 0;
   - đầu vào là lịch cũ, sự cố, bảng ứng viên; đầu ra JSON;
   - kiểm bằng cùng bộ kiểm khả thi; công bố lời nhắc và đầu ra.
7. H2 làm mốc chính xác.

### Metric
- **Lợi ích giữ lại:** U(π)/U*.
- **Số thay đổi:** D, tách bỏ, thêm, thay, đổi chỗ; tỉ lệ điểm giữ đúng chỗ; tỉ lệ giữ nguyên điểm kế tiếp; tổng phút lệch giờ.
- **Vi phạm giờ:** tỉ lệ lịch có ít nhất một vi phạm khung giờ hoặc giờ kết thúc.
- **Đường biên:**
  - k_min;
  - k95, là k nhỏ nhất đạt 95% U*;
  - tỉ lệ điểm biên mà quét λ bỏ sót;
  - sai số so với biên chính xác.
- **Thời gian chạy:** trung vị và P95.
- So cặp bằng kiểm định Wilcoxon; tách theo loại sự cố và điểm cắt.

### Bảng kết quả mẫu
Mọi ô "…" là chưa có số liệu. Không có số nào ở hai bảng dưới là kết quả thật.

| Phương pháp | Lợi ích giữ lại (%) | Số thay đổi trung bình | Vi phạm giờ (%) | Sai số so với biên chính xác (%) | Thời gian trung vị / P95 |
|---|---|---|---|---|---|
| Bỏ điểm bị lỡ | … | … | … | … | … |
| Xếp lại từ đầu, không phạt | 100 (mốc) | … | 0 | (không áp dụng) | … |
| Xếp lại có phạt λ | … | … | 0 | … | … |
| Heuristic hiện tại của Journie | … | … | … | … | … |
| VNS động kiểu Le et al., thêm khung giờ | … | … | … | … | … |
| LLM sửa lịch (mẫu 200 ca) | … | … | … | … | … |
| H2, D ≤ k (mốc chính xác) | … | … | 0 | 0 (mốc) | … |
| Đề xuất H1, k ≤ 1 | … | … | 0 | … | … |
| Đề xuất H1, k ≤ 2 | … | … | 0 | … | … |
| Đề xuất H1, k ≤ 3 | … | … | 0 | … | … |

| Sự cố | k_min trung bình | F(1)/U* | F(2)/U* | F(3)/U* | Số phép sửa của xếp lại từ đầu | Điểm biên bị quét λ bỏ sót (%) |
|---|---|---|---|---|---|---|
| Trễ | … | … | … | … | … | … |
| Mưa | … | … | … | … | … | … |
| Đóng cửa | … | … | … | … | … | … |
| Trễ cộng mưa | … | … | … | … | … | … |

## 5. Định vị trong phần related work

Câu mẫu viết bằng tiếng Anh vì bài nộp bằng tiếng Anh.

1. "Yuan et al. (2026) compare full replanning, hierarchical plan repair and local LLM editing on TREK-derived multi-day itineraries and report stability post hoc. As they state, none of the evaluated methods optimises similarity to the accepted plan or is shown to return a minimum-edit repair. We make the number of edits an explicit budget and compute, for every budget k, a provably utility-optimal repair of a single-day itinerary with opening-hour windows, travel times and an already executed prefix."
2. "TripTide (Karmakar et al., 2026) benchmarks LLM revisions under disruptions and introduces a plan-bound traveller profile with deviation metrics; it does not propose a repair algorithm. Our edit budget plays the role of that profile as a user-set parameter, and we report sequence-level deviation in the same spirit."
3. "Our setting is narrower than both: one traveller, one day, attractions only, and disruptions known at decision time. We do not claim plan stability as new: minimum-distance repair with guarantees exists for classical planning (Saetti and Scala, 2022, 2025), bounded-deviation recovery for vehicle routing, and schedule-deviation penalties for single-agent activity scheduling (Vogler et al., 2026)."

Lưu ý khi dùng:
- **Số của Yuan et al.** đã dò trên văn bản HTML:
  - sự cố đơn: khoảng 6,6 phép sửa và 65% giữ nguyên khi lập lại toàn bộ, so với 1 phép sửa và 92% khi sửa;
  - sự cố kép: khoảng 9,0 và 57%, so với 2,1-2,2 và 86-87%.
- Bài đó là bản thảo chưa bình duyệt. Bối cảnh khác (nhiều ngày, liên thành phố, đếm theo ô cam kết), nên không so trực tiếp con số.
- Không viết rằng họ "thất bại": bài của họ là bài so sánh, không đề xuất phương pháp.
- Số của TripTide (tỉ lệ đạt 29-42% của GPT-4o) mới qua bước trích tự động. Phải đối chiếu bản ACL trước khi trích.

## 6. Việc tuần 2-3 và cổng tuần 3

### Tuần 2
1. **Tìm tay trên DBLP và Google Scholar**, khoảng 45 phút. Truy vấn:
   - `orienteering repair`
   - `orienteering replanning stability`
   - `itinerary repair minimal change`
   - `tourist trip replanning disruption`
   - `minimal perturbation orienteering`
   - `local branching orienteering`
   
   Đặt cảnh báo Scholar cho các cụm này.
2. **Đọc cho đủ:**
   - Yuan et al. bản PDF, đọc tuần tự; kiểm xem có mã và dữ liệu không.
   - Pan & Mao, phần cuối.
   - Li & Choi 2026.
   - Bài ESWA 2025 về định tuyến lại thu gom rác y tế (chưa có tóm tắt).
   - Sörensen 2006 và Pillac et al. 2012, toàn văn.
   - Tìm bài viết của Vogler et al.
3. **Chốt định nghĩa:** D (trọng số, phép thay, phép sửa bắt buộc), ba phép biến đổi sự cố, hàm lợi ích. Viết một trang phát biểu và ba mệnh đề nhỏ:
   - dạng phạt quy về OPTW;
   - đa thức khi k cố định;
   - ví dụ đường biên không lõm.
4. **Bộ sinh sự cố** cho benchmark OPLib, có hạt giống.
5. **Mốc chính xác H2** và hai baseline: bỏ điểm bị lỡ, xếp lại từ đầu.

### Tuần 3
6. **Đo thử** trên ít nhất 300 ca benchmark và 200 ca TP.HCM:
   - số phép sửa của xếp lại từ đầu;
   - F(k) với k = 0..4;
   - k95;
   - tỉ lệ điểm biên bị quét λ bỏ sót;
   - mức thua của "bỏ điểm bị lỡ".
7. **Bản thử H1,** kiểm khớp với H2, đo thời gian.
8. **Dữ liệu TP.HCM:** sửa cờ ngoài trời, mức thời lượng theo loại, ma trận thời gian đi, tải chuỗi mưa.

### Cổng tuần 3
Chốt ngưỡng trước khi xem số liệu. Các ngưỡng dưới đây là đề xuất của tôi.

- **A, bài toán có ý nghĩa.** Xếp lại từ đầu đổi trung bình ít nhất 2 phép sửa ở nhóm trễ hoặc nhóm mưa. Nếu trung bình không quá 1 thì chuyển sang G14, đúng như tài liệu xếp hạng.
- **B, có đánh đổi thật.** Ít nhất 25% ca có k95 ≥ 2 hoặc có từ 3 điểm biên khác nhau.
- **C, baseline đơn giản không đủ.** Một trong hai điều sau:
  - "bỏ điểm bị lỡ" thua F(k) cùng k ít nhất 5% lợi ích ở ít nhất 20% ca;
  - quét λ bỏ sót ít nhất 10% điểm biên.
- **D, chính xác trong ngân sách.** H1 khớp H2 trên 100% ca thử; P95 không quá 1 giây.
- **E, không có bài trùng** sau khi tìm tay.

Quyết định:
- A và E đạt, cộng B hoặc C, cộng D: đi tiếp theo kế hoạch tuần 4-7.
- A hoặc E hỏng: chuyển G14.
- A đạt nhưng B và C cùng hỏng: đóng góp mỏng. Bàn với giảng viên hướng dẫn giữa hai lựa chọn: bài thực nghiệm kèm benchmark, hoặc G14.
- D hỏng: lấy H3 kèm chặn trên làm phương pháp chính.

## Nguồn
- [Yuan et al. 2026](https://arxiv.org/abs/2609.19654)
- [TripTide, arXiv](https://arxiv.org/abs/2510.21329) và [bản ACL](https://aclanthology.org/2026.findings-acl.2002/)
- [Le, Middendorf, Shi 2022](https://link.springer.com/article/10.1007/s42979-022-01205-x)
- [Zhai & Awasthi 2025](https://research.google/blog/optimizing-llm-based-trip-planning/)
- [iTIMO](https://arxiv.org/abs/2601.10609)
- [Pan & Mao 2024](https://arxiv.org/abs/2402.07662)
- [Vogler, Meunier, Bierlaire, slide STRC 2026](https://transp-or.epfl.ch/documents/talks/2026VoglerSTRC.pdf)
- [Saetti & Scala, ICAPS 2022](https://ojs.aaai.org/index.php/ICAPS/article/view/19815) và [KER 2025](https://doi.org/10.1017/S0269888925100076)
- [Sörensen 2006](https://ideas.repec.org/a/spr/cejnor/v14y2006i2p193-207.html)
- [Bài xe chở gỗ, arXiv 2607.20901](https://arxiv.org/abs/2607.20901)
- [Şeref, Ahuja, Orlin 2009](https://ideas.repec.org/a/inm/oropre/v57y2009i3p586-594.html)
- [Balas & Simonetti 2001](https://doi.org/10.1287/ijoc.13.1.56.9748)
- [Nebel & Koehler 1995](https://gki.informatik.uni-freiburg.de/papers/nebel-koehler-aij95.pdf)
- [Demange et al. 2021](https://arxiv.org/abs/2201.00777)
- [Yalcin et al. 2023](https://ideas.repec.org/a/spr/opsear/v60y2023i4d10.1007_s12597-023-00678-5.html)
- [IGAPR 2024](https://doi.org/10.1109/icemce64157.2024.10862737)
- [ROAM 2026](https://arxiv.org/abs/2611.09407)
- [TravelGenie 2026](https://doi.org/10.47772/ijriss.2026.100900705)
- [Li & Choi 2026](https://www.preprints.org/manuscript/202604.1364)
- [OPLib](https://unicen.smu.edu.sg/oplib-orienteering-problem-library)

Không sửa tệp nào trong dự án. Bản tải về của bài Yuan et al., kết quả OpenAlex và slide Vogler et al. chỉ lưu tạm trên máy, không đưa vào repo.
