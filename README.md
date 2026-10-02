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
├── components/          # Shared UI and providers
│   ├── motion/          # Reusable motion: RevealHeading, Magnetic, Tilt, CountUp, Coordinates
│   └── scenes/          # Place-based animated backdrops (karst, terraces, lanterns, city, bay, sunset, footer sky)
├── content/site.ts      # Brand content, destinations and journey chapters
├── hooks/               # Shared React hooks (language, motion preferences, active section)
├── i18n/messages.ts     # Vietnamese and English copy
├── layouts/             # Global page chrome
├── pages/               # Route-level page content (composes sections)
├── sections/            # One file per landing page section
├── types/               # Shared TypeScript types
├── utils/               # Formatting and CSS helpers
├── App.tsx
├── index.css
└── main.tsx
```

## Motion and Scenes

Scrolling the page reads as travelling through Vietnam. Each section has a backdrop drawn for a place:

| Section | Place | Scene |
| --- | --- | --- |
| Hero | Ninh Binh | Limestone towers in layered mist, low sun, birds |
| Story | Ha Giang | Terraced hillsides drifting at different speeds |
| How it works | Hoi An | Swaying lantern canopy and lanterns rising from the river |
| Sample itinerary | Saigon | Skyline at dusk with Landmark 81, Bitexco, twinkling windows and traffic light trails |
| Always adapting | Ha Long | Islets, a junk on the swell, light rain |
| Explore | Six destinations | Photo backdrop with weather and life that change per destination |
| Closing call to action | Phu Quoc | Setting sun, waves and palms |

Notes for working on it:

- Motion uses [`motion`](https://motion.dev) for scroll-linked and in-view animation and [`lenis`](https://lenis.darkroom.engineering) for smooth scrolling. Ambient loops (mist, waves, lanterns) are plain CSS keyframes in `src/index.css`.
- Every scene is wrapped in `SceneFrame`, which pauses its CSS animations while off-screen.
- Under `prefers-reduced-motion`, smooth scroll, parallax, autoplay and particle layers are turned off and content shows in its final state.
- Pointer effects (tilt, magnetic buttons, cursor parallax) only run on devices with a fine pointer and hover.
- Custom CSS classes in `index.css` live in `@layer components`, so Tailwind utilities can override them.
- Scene sizes that must stay visible next to content are set in `rem`, not as a percentage of the section height.
- Genie details: `MagicCursor` (lamp-glow ring and a stardust trail, mouse only; other components can scatter dust with the `journie:sparkle` window event), `WishLamp` in the hero (rub the lamp for a trip wish), a shooting star in the Saigon sky and a night-sky footer.
- Smoothness: Lenis is driven by motion's frame loop, scroll layers that move are promoted with `will-change`, only the active Explore photo is mounted (Ken Burns runs in CSS), and most animation is transform/opacity so it stays on the compositor. Avoid adding `backdrop-filter` or animated SVG attributes on large areas.
- The footer uses `journie-lockup-light.png`, a recoloured copy of the lockup (forest green to paper) so the logo reads on the dark footer. Regenerate it if the logo changes.
- To add a destination, extend `destinations` in `src/content/site.ts` and add its copy to both languages in `src/i18n/messages.ts`.

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

When replacing an image, update the corresponding file in `src/assets/images`, the data in `src/content/site.ts`, the attribution in the footer, and this image source table

## Before Deployment

- Run `npm run lint` and `npm run build`.
- Configure the domain, canonical URL, and Open Graph image.
- Test responsiveness at 360px, 768px, 1024px, and 1440px.
- Verify attribution if any images have changed.
- Choose a license for the source code before making the repository public.
