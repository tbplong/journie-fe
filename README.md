## Running the Project

Node.js 20.19 or later is required. The project is currently tested with Node.js 24 and npm 11.

```bash
npm install
npm run dev
```

Main commands:

```bash
npm run dev      # Start the development server
npm run lint     # Check the source code with Oxlint
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build locally
```

## Main Structure

```text
src/
├── assets/images/       # Destination images and Journie brand assets
├── components/Header.tsx
├── content/site.ts      # Brand name, content, and landing page data
├── App.tsx
├── index.css
└── main.tsx
```

## Images and Licenses

Images are downloaded from Wikimedia Commons and stored locally. Each image retains its author's license and is not automatically covered by the source code license.

| Destination | Author | License | Source |
| --- | --- | --- | --- |
| Trang An, Ninh Binh | Jakub Hałun | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1456_5313.jpg) |
| Ha Thanh, Ha Giang | Benjamin Smith | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_1.jpg) |
| Hoi An Ancient Town | Steffen Schmitz (Carschten) | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-06.jpg) |
| Ha Long Bay | Vyacheslav Argenberg | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ha_Long_Bay,_Vietnam,_View_from_above.jpg) |
| Phu Quoc Beach | dronepicr | CC BY 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Beautiful_beach_on_Phu_Quoc_island_Vietnam_(39543775721).jpg) |
| Saigon River, Ho Chi Minh City | Diego Delso | CC BY-SA 3.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:R%C3%ADo_Saig%C3%B3n,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_29.JPG) |

When replacing an image, update the corresponding file in `src/assets/images`, the data in `src/content/site.ts`, the attribution in the footer, and this image source table.

## Before Deployment

- Run `npm run lint` and `npm run build`.
- Configure the domain, canonical URL, and Open Graph image.
- Test responsiveness at 360px, 768px, 1024px, and 1440px.
- Verify attribution if any images have changed.
- Choose a license for the source code before making the repository public.
