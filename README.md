# Journie Landing Page

Landing page của Journie, nền tảng lập kế hoạch du lịch Việt Nam cá nhân hóa và linh hoạt thích ứng bằng AI.

> GitHub repository description đề xuất: `Journie - nền tảng lập kế hoạch du lịch Việt Nam cá nhân hóa và thích ứng bằng AI.`

## Tổng quan

Trang giới thiệu cách sản phẩm hiểu sở thích, ngân sách và quỹ thời gian của du khách để xây dựng lịch trình thực tế. Giao diện hiện tại tập trung vào du lịch Việt Nam, sử dụng phong cách editorial và hình ảnh từ nhiều vùng miền.

Tên **Journie** kết hợp từ **Journey** và **Genie**, thể hiện một người bạn đồng hành giúp biến ý tưởng du lịch thành hành trình thực tế.

Đây là landing page tĩnh. Các tính năng như đăng nhập, bản đồ thật, dữ liệu thời tiết và tạo lịch trình AI chưa nằm trong phạm vi hiện tại.

## Công nghệ

- React 19 và TypeScript
- Vite
- Tailwind CSS 4
- Lucide React
- Be Vietnam Pro và Lora, được self-host bằng Fontsource
- Oxlint

## Chạy dự án

Yêu cầu Node.js 20.19 trở lên. Dự án hiện được kiểm tra với Node.js 24 và npm 11.

```bash
npm install
npm run dev
```

Các lệnh chính:

```bash
npm run dev      # Chạy development server
npm run lint     # Kiểm tra mã nguồn bằng Oxlint
npm run build    # Type-check và tạo production build
npm run preview  # Xem production build ở local
```

## Cấu trúc chính

```text
src/
├── assets/images/       # Ảnh địa danh và bộ nhận diện Journie
├── components/Header.tsx
├── content/site.ts      # Tên thương hiệu, nội dung và dữ liệu landing page
├── App.tsx
├── index.css
└── main.tsx
```

## Nhận diện thương hiệu

Các asset đang được sử dụng:

| File | Mục đích |
| --- | --- |
| `src/assets/images/logo_trans_notext.png` | Logo không chữ bản gốc, nền trong suốt |
| `src/assets/images/logo_trans_text.png` | Logo đầy đủ bản gốc, nền trong suốt |
| `src/assets/images/journie-mark.png` | Bản đã crop và tối ưu dùng trong header |
| `src/assets/images/journie-lockup.png` | Bản đã crop và tối ưu dùng trong footer |
| `public/favicon.png` | Biểu tượng trình duyệt tạo từ logo không chữ |

Tên thương hiệu được quản lý qua `VITE_SITE_NAME` trong `.env`. Logo và nội dung marketing được cấu hình tại `src/content/site.ts`.

Nếu thay đổi thương hiệu trong tương lai:

1. Đổi `VITE_SITE_NAME` trong `.env` và `.env.example`.
2. Đổi fallback trong `src/content/site.ts`.
3. Đổi `name` và `description` trong `package.json`, sau đó chạy `npm install` để đồng bộ `package-lock.json`.
4. Thay logo header, logo footer và `public/favicon.png`.
5. Cập nhật tiêu đề README, GitHub repository description, repository slug và cấu hình deploy.
6. Tìm tên cũ bằng `rg -n "Journie|journie" --glob "!node_modules/**" --glob "!dist/**" .`.
7. Chạy lại `npm run lint` và `npm run build`.

## Hình ảnh và giấy phép

Ảnh được tải từ Wikimedia Commons và lưu cục bộ. Mỗi ảnh giữ nguyên giấy phép của tác giả, không mặc nhiên dùng chung giấy phép với mã nguồn.

| Địa danh | Tác giả | Giấy phép | Nguồn |
| --- | --- | --- | --- |
| Tràng An, Ninh Bình | Jakub Hałun | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1456_5313.jpg) |
| Hạ Thành, Hà Giang | Benjamin Smith | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_1.jpg) |
| Phố cổ Hội An | Steffen Schmitz (Carschten) | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-06.jpg) |
| Vịnh Hạ Long | Vyacheslav Argenberg | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ha_Long_Bay,_Vietnam,_View_from_above.jpg) |
| Bãi biển Phú Quốc | dronepicr | CC BY 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Beautiful_beach_on_Phu_Quoc_island_Vietnam_(39543775721).jpg) |
| Sông Sài Gòn, TP.HCM | Diego Delso | CC BY-SA 3.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Saig%C3%B3n,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_29.JPG) |

Khi thay ảnh, cần cập nhật đồng thời file trong `src/assets/images`, dữ liệu tại `src/content/site.ts`, attribution trong footer và bảng nguồn ảnh này.

## Trước khi deploy

- Chạy `npm run lint` và `npm run build`.
- Cấu hình domain/canonical URL và ảnh Open Graph.
- Kiểm tra responsive ở 360px, 768px, 1024px và 1440px.
- Kiểm tra lại attribution nếu thay đổi hình ảnh.
- Chọn giấy phép cho phần mã nguồn trước khi công khai repository.
