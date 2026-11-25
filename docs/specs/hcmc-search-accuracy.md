# Spec: Đợt làm chuẩn tìm kiếm địa điểm TP.HCM

Trạng thái: **bản nháp, chờ duyệt.** Đợt này bắt đầu sau khi đợt sửa tìm kiếm hiện tại xong.
Ngày: 2026-11-24

## 1. Mục tiêu

Với 925 địa điểm ở TP.HCM, mỗi câu tìm phổ biến phải cho kết quả đúng loại nơi. Trang đầu không được có nơi sai loại. Lý do hiển thị cho từng nơi phải đúng.

## 2. Việc làm

1. **Bộ câu thử khoảng 80 câu cho TP.HCM:**
   - Các kiểu viết: tiếng Việt có dấu, không dấu, tiếng Anh, gõ sai một chữ, câu nói thường ("kiếm chỗ…", "muốn đi…").
   - Các nhóm: ăn (món, chay, hải sản, Michelin, ăn đêm), cà phê (yên tĩnh, làm việc, view), bar/pub/nhậu, bảo tàng, chùa/nhà thờ, chợ, công viên, mua sắm, chụp ảnh, trẻ em, trời mưa, đi bộ đêm.
   - Kết quả mong đợi lấy từ dữ liệu: id thật và loại thật, không lấy từ kết quả hiện tại.
2. **Kiểm tra loại địa điểm:**
   - Đầu tiên lọc tự động những dòng có dấu hiệu lệch, ví dụ tên có "chè" mà xếp là café, tên có "bar" mà xếp là quán ăn.
   - Chỉ đọc lại các dòng bị gắn cờ và đề xuất sửa qua `poi_overrides.csv`. Đây là luật có sẵn, không đổi kiến trúc.
3. **Bổ sung mô tả cho TP.HCM:** đợt trước mới làm 127 trên 925 dòng. Đợt này mở rộng thêm cho bảo tàng, chùa, chợ, công viên, mua sắm, điểm tham quan còn thiếu từ người dùng hay tìm. Vẫn giữ nguyên đoạn đã nghiên cứu, chỉ thêm một câu soạn từ dữ liệu của chính dòng đó. Có sao lưu, chỉ ghi các cột description, search_lex, embedding.
4. **Sửa và đo lại:** chỉ sửa luật, từ khoá và ngưỡng, rồi chạy lại bộ câu thử và toàn bộ test.

## 3. Tiêu chí chấp nhận

- Ít nhất 90% câu thử TP.HCM có từ 6 kết quả đúng loại trở lên trong top 8.
- Trang đầu không có nơi sai loại rõ ràng.
- Lý do "Mô tả có …" chỉ hiện khi mô tả thật sự có chữ đó, đúng dấu.
- 35 ca eval cũ và các test backend và frontend vẫn qua.
- Số dòng trong DB vẫn là 1.239, số embedding khớp, các cột giá và website không đổi.

## 4. Các bước khi được duyệt

1. Viết bộ câu thử từ dữ liệu và chạy lọc lệch loại.
2. Đọc các dòng bị gắn cờ theo lô 25-30 dòng và đề xuất loại đúng.
3. Kiểm chứng lại toàn bộ đề xuất sửa loại và mẫu mô tả mới.
4. Áp dụng luật, sao lưu, embed lại.
5. Phân xử các điểm còn bất đồng.
6. Đo lại, so trước và sau.
