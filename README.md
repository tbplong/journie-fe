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
├── api/                 # FastAPI-shaped mock endpoints (auth, trips, planner, places, profile, analytics) + TanStack Query hooks
├── app/                 # Signed-in workspace: AppShell, routes, route guards
├── assets/images/       # Destination images, Journie brand assets, and `places/` for per-place photos (see below)
├── components/
│   ├── art/             # Khatam star, dividers
│   ├── auth/            # Auth shell (split card, day/night sky), lamp toggle, mascot-aware fields
│   ├── icons/           # Journie's own duotone icon set: categories, weather, navigation (preview at /__icons in dev)
│   ├── mascot/          # Journie, the carpet-riding monkey, and DiCompanion, the pet that sits in the corner and looks or points
│   ├── map/             # Leaflet route map (OSRM geometry with an offline-safe fallback)
│   ├── motion/          # Reusable motion: RevealHeading, Magnetic, Tilt, CountUp, Coordinates
│   ├── place/           # POI detail sheet (info, reviews, add to trip) and art/: the place illustrations (/__art in dev)
│   ├── scenes/          # Place-based animated backdrops for the landing page
│   ├── trip/            # Timeline (drag and drop), day tabs, stats, plan explanation
│   ├── ui/              # Sheet, toasts, field, segmented control, switch, stars, meters
│   └── weather/         # WeatherLayer (rain, storm, clouds, stars), SkyBody (sun and moon) and WeatherChip
├── content/site.ts      # Brand content, destinations and journey chapters
├── domain/              # Pure planning logic: POIs, scoring, solver, replanner, intent extraction, edits
├── hooks/               # Shared React hooks (language, motion preferences, inline translation)
├── i18n/messages.ts     # Vietnamese and English copy for the landing page
├── layouts/             # Landing page chrome
├── pages/               # auth/, app/ (workspace pages) and the landing page
├── sections/            # One file per landing page section
├── lib/                 # Small helpers: cheer event
├── store/               # Zustand stores: session, UI state, toasts, notifications, portal transition, sky, Journie preferences
├── styles/app.css       # Workspace, night theme, auth torch, mascot and postcard styling (landing palette)
├── App.tsx
├── index.css
└── main.tsx
```

## The Journie App

The landing page lives at `/`. Everything else follows the system description in the project report
(React + TypeScript + Vite SPA, TanStack Query for server state, Zustand for transient UI state).

| Route | Report module | What it does |
| --- | --- | --- |
| `/login`, `/register` | Login / Registration | Verify password (with error states), onboarding interests. A split card (Trang An arch photo with Journie on one side, the form on the other) under a live sky. Journie follows the pointer, watches the field you are typing in, covers its eyes for passwords, shakes its head on errors and celebrates success before a portal transition into the app. The torch button in the password field switches on a soft light that drifts after the pointer: it reads out the password only where it falls on the field, dims the scenery at night and wakes hidden things (a winking moon, lanterns, a treasure chest, lotus, a constellation, a kite, a flock, a leaping koi, fireflies, a message on the cliff). Day or night and the weather follow the real clock and forecast, or the sky chip. |
| `/app` | Dashboard | Quick trip box, live and upcoming trips, destination picks based on the taste profile. |
| `/app/plan` | Itinerary creation | Natural-language request → extracted constraints (hard vs soft) → editable parameters → pipeline (LLM, data gathering, scoring, CP-SAT-style solve, OSRM routing, time slots) → the trip is saved and opened for editing right away (places only, until "Create schedule"). |
| `/app/trips/:id` | Itinerary customization | A new plan lists places only (no times); "Create schedule" then shows times and routes. An edit written in words keeps every stop it does not touch on its day (only what it removes or adds changes); the stops-per-day stepper sets how many places a day holds. Drag-and-drop (or Alt+Arrow / buttons) reorder, duration stepper, lock mandatory stops, add or remove places. Every edit is re-timed and validated against opening hours and the day window; invalid edits are rejected with the reason. "Ask Journie to adjust" rebuilds the plan from new requests and shows a diff before applying. Undo is available. |
| `/app/trips/:id/live` | Trip management and adaptive replanning | Simulated clock and GPS position, time-budget ring, condition monitor log, and a disruption simulator (traffic, heavy rain, closure, running late). Replanning solves `I' = argmax [Utility(I) − λ·ChangeCost(I, I_old)]` for the λ you pick on a slider. |
| `/app/discover` | Search and discovery | Keyword and contextual search ("coffee near Chùa Cầu"), filters by area, type, price and rating, list and map views, venue details with reviews. |
| `/app/profile` | Profile management | Deliberately short: a few tappable tastes (or a sentence in your own words, which Journie turns into interests and avoid-tags and shows back live), pace, foods you cannot eat (typed in by hand), one alerts switch and saved places. |
| `/app/account` | Account management | Name, email and phone, change password (current password required) and a reset link. Accounts live in this browser until the backend has a sign-in API. |
| `/app/analytics` | Data collection and analytics (Business Admin) | Shows no numbers until the backend has an analytics API; interactions are logged in this browser by `track()`. |

Demo accounts (also available as one-tap chips on the login page): `lu.khach@journie.vn` (traveler) and
`ba@journie.vn` (Business Admin), both with password `journie123`.

### Planning logic (`src/domain`)

- `scoring.ts` implements Eq. (3) of the report, `S = αC + βR + γP + δB + εG`.
- `solver.ts` is an exact depth-first branch-and-bound for the orienteering problem with time windows. It enforces opening hours, travel time, the day window, budget and mandatory stops, and keeps meals sensible: at most three restaurants a day, at least 150 minutes apart (a must-visit restaurant is never dropped for it). A single-day plan whose search completes is reported `OPTIMAL`; multi-day plans are decomposed per day and reported `FEASIBLE`. It mirrors the OR-Tools CP-SAT model that the backend will use. It plans from the places `/retrieval` returned, and a place closed on a trip weekday is left out unless it is a must-visit.
- `replan.ts` implements the dynamic incremental replanning objective with a change cost for dropped, added, shifted and re-ordered stops.
- `nlp.ts` is the on-device keyword reader. The planner no longer uses it to read requests (the backend's Gemini does); only the profile page keeps it, to preview your own sentence as you type. It reads "không cà phê" as something to avoid, not an interest.
- The app covers Ho Chi Minh City only, the one city the backend has places for. Places, hours and prices come from the backend (see below); the landing page and sign-in photos of other destinations are decoration.

### Connecting the real backend

Most of `src/api/*` still runs against an in-browser mock with the same shapes as the planned FastAPI endpoints,
persisted in `localStorage`. **Reading the traveler's request is already wired to the real backend** (journie-be,
`POST /chat`, Gemini with deterministic repairs):

```bash
# in journie-be (needs GEMINI_API_KEY and a reachable DATABASE_URL with the places loaded, both in its .env):  uv run fastapi dev app/main.py
npm run dev                    # .env.development already sets VITE_API_URL=/api; BACKEND_URL defaults to http://127.0.0.1:8000
```

- `api/extraction.ts` sends the text; `domain/intentFromExtraction.ts` turns the returned `Extraction` into the
  `Intent` the review screen and planner already use (dates, budget, hours, interests, must-visit and avoid, with the
  model's own hard/soft labels). Nothing is guessed from keywords in the original text, so the chips show exactly what the
  model understood. Anything the traveler excludes (`avoid` or an `exclude` constraint) is dropped from the interests,
  because the model sometimes lists the same word in both. Pace and transport are not part of the extraction, so they come
  from the profile and the review form.
- There is no on-device substitute: if the backend is down, out of quota (`llm-rate-limited`), too slow or `VITE_API_URL`
  is unset, the planner shows the reason (`api/errorText.ts`) and the traveler retries.
- A destination other than Ho Chi Minh City is shown with a warning and waits for the traveler to pick Ho Chi Minh City.
- The review screen also shows what the model could not find (`missing_fields`), anything it flagged as too vague
  (`needs_clarification`) and contradictions it noticed (`possible_conflicts`).
- **The places are the backend's too** (`POST /retrieval`, `api/catalog.ts`). Planning sends the same extraction and plans from
  the places it returns, with must-visit names resolved by the backend. `useCatalog` loads all of them (a page of 20 per interest
  section) when the workspace opens; `domain/pois.ts` keeps them in memory and localStorage so saved trips, Discover, the dashboard picks
  and the place sheet all read one list. `domain/poiFromCard.ts` turns a backend card into the planner's `Poi`: opening hours are parsed
  from OSM syntax (`domain/openingHours.ts`; one window valid on every open day, the longest interval when a lunch break splits the day,
  closed weekdays left out of the trip), visit time and typical spend per category are priors from journie-data (`duration.v1.yaml`,
  `cost.v1.yaml`), and `quality` is the backend's own score. Nothing is invented per place: there are no ratings or reviews, and a price
  shows as an estimate (`~`) or "price unknown" unless the data states it.
- `/retrieval` is the backend's own, unmodified: it reads the places from its Postgres database (`DATABASE_URL`). Without a reachable database it answers 503
  (`retrieval-db-unavailable`) and the planner shows "could not reach the places database", so start the database first.
- `tests/llm/` holds 60 Ho Chi Minh City cases from simple to complex (form-first input, extra wishes, avoids, must-visit places, times, trip edits) run against the real backend (see its README).
- A deployed backend called directly from the browser needs CORS for this site's origin; with the `/api` proxy or a
  same-origin rewrite it does not.

Replacing another mock function body with `postJson` (see `api/http.ts`) is the only change needed; the pages and
TanStack Query hooks do not change. The map requests tiles from `tile.openstreetmap.org` and road geometry from the
public OSRM demo server; when either is unreachable the map still shows pins and straight route hops.

### Design notes

Everything follows the landing page: `paper` ground, `forest` green ink, `terracotta` for action and accents, `sun`
yellow, `jade` and the occasional `dusk` purple. The app tokens (`night`, `midnight`, `lapis`, `firuze`, `pomegranate`,
`gold`) are aliases of those colours, so nothing in the workspace drifts off palette. Corners are near-square with
hairline borders (the `.app-root` scope remaps Tailwind's radius scale), and photos sit in arches like the Trang An
card. Charts use landing-palette hues that were checked with the dataviz validator.

- **Journie** (`components/mascot`) is a small monkey mascot on a flying carpet, drawn as one soft flat shape: a round
  head-and-body bean, a heart-shaped cream face, short limbs, no outlines and no glossy highlights, in a warm clay,
  cream, and the app's own terracotta, gold and jade (a terracotta carpet with a gold edge and a matching fez, a jade
  nightcap), so it stands out from both the green scenery and the cream pages without leaving the palette. Arms are two bones of fixed length solved with two-bone IK (`solveArm`), so a limb bends but never
  stretches, whatever it reaches for. The face blinks, the head and eyes turn toward the pointer, the mitts cover the
  eyes for passwords, and moods are idle, watching, hiding, peeking, thinking, error, joy, sleepy, wave, hungry
  (pats its tummy) and hot (fans itself). It dresses for the sky (fez or nightcap, sunglasses, umbrella in rain and
  storm in every mood except the ones that cover the eyes). Inside the app `DiCompanion` sits small in the bottom
  corner and never chases the cursor: it looks toward the pointer and, when you rest on a button or link for a moment,
  raises the nearer arm and points at it (the sidebar switch "Journie chỉ vào nơi bạn trỏ" turns pointing off). It dozes
  off after a while, cheers when something is saved, and gives tips for the weather, the hour and the page, some with
  a button that opens Discover pre-filtered. The bigger Journie on the dashboard (`useDiMoment`) does not copy it: it acts
  on the sky and the clock: umbrella and worried hands in a storm, umbrella in rain, a rumbling tummy and a "food
  ideas" button at breakfast, lunch and dinner, a fan and sunglasses in the midday sun, asleep late at night.
- **Sky** (`components/weather`, `store/weatherStore.ts`): the time of day (day or night) and the weather (clear,
  cloudy, rain, storm) are two independent settings, so a rainy night is possible. Both follow the clock and the
  deterministic forecast on `auto`, or can be pinned from the sky chip. Changing the time of day plays `SkySwitch`:
  a quiet landscape fills the screen, the old sun or moon sinks behind the ridges, the new one climbs slowly up
  from them (dusk or dawn glow, stars fading in or out) and only then does the app switch theme underneath; people
  who prefer reduced motion get the plain switch. The workspace has a real night theme
  (`html[data-app-phase='night']` flips the foreground tokens and surfaces, inverts map tiles), `SkyBody` parks the
  sun or the moon in the corner, `HeroScene` puts the weather behind the dashboard hero (dimmed sun or moon,
  drifting clouds, a rain veil, lightning in storms), and `WeatherLayer` draws clouds in CSS and everything that
  moves (rain with ground ripples, lightning, fireflies, stars, sun motes) on one canvas that stops itself when
  idle and pauses when the tab is hidden. Inside the workspace the rain is deliberately light (few, faint,
  slow drops; lightning is only a very faint slow glow, never a white-out), and the sky chip has a switch,
  "Moving rain, lightning and fireflies", that stops all falling particles (clouds and tint stay). On the live-trip page, "heavy rain" turns the whole app rainy until the
  traveler decides on a replan.
- **Pictures of places** (`domain/placeMedia.ts`, `components/place/PlaceImage.tsx`): real photographs first,
  drawings only when there is no photograph. A place uses, in order: `src/assets/images/places/<poi-id>.jpg` (drop a
  file in and it is picked up, list it in `places/CREDITS.md`); otherwise the photograph of its city, framed
  differently for every place; otherwise the flat illustration (`components/place/art`). Today photographs exist for
  six cities, so Hà Nội and Đà Lạt are the only places still drawn until photos for them are added.
- **One language at a time**: every visible string follows the language switch. Data keys never reach the screen:
  place tags are translated (`domain/tags.ts`), a place's name, ward, address and opening hours read in the page
  language (`domain/placeText.ts`: "Phường Bến Thành" is "Ben Thanh Ward", "Mo-Su" is "Mon-Sun"), trip titles are
  written in the page language (`domain/tripText.ts`), and the map's own buttons are localised.
- **A different place each visit** (`content/heroPlaces.ts`): the photograph behind Journie on the sign-in and register
  pages and in the landing hero is picked at random from the six destinations we have photos of, once per page load
  (never the one shown on the previous load, remembered in `journie-hero-last`). The caption, coordinates, weather card,
  the side journey rail and which hidden torch effects appear (a leaping koi only over water) all follow that place.
- **Logo** (`components/Logo.tsx`): the lamp mark is the picture (`journie-mark.png` for light backgrounds,
  `journie-mark-light.png` for dark ones) and the name beneath it is live text in *Journie Display*, so the logo and
  the headings share one typeface everywhere (sign-in, sidebar, footer, portal transition).
- **Typeface**: headings use *Journie Display*, drawn for this project. Each letter is a centre-line swept with a
  tilted elliptical nib (so strokes get thick and thin like a broad pen), the dot of the i and j is a small ring
  (a map pin), and every Vietnamese letter is a base glyph plus a diacritic placed by rule. The skeletons and the
  builder live in `tools/font` (`python build.py`, needs fonttools, shapely, brotli) and write the three woff2 files
  (regular, bold, italic) into `src/assets/fonts`. Body text is Be Vietnam Pro.
- **Icons** (`components/icons`) are drawn on a 48 grid with one ink line and two flat colours printed slightly off
  register. Category, weather, sky and navigation icons share it; open `/__icons` in dev to see the sheet.
- **Place illustrations** (`components/place/art`): every place has its own flat-vector scene (sky for the time of
  day, ridge, ground, and the landmark or dish in front: the Turtle Tower, Chùa Cầu, a bowl of phở, a junk in the bay,
  a cable car…). A table of motifs maps each place id to a drawing; the sun, clouds and stars are seeded by the id so
  a card always looks the same. `/__art` in dev shows them all.
- **Discover** is a postcard wall: city "passport stamps", sticker-style category buttons, price coins that flip when
  picked, and cards with the place's illustration, a postmark, a dotted route that runs on hover, a ticket edge and a
  burst of hearts when you save.
- **Small motion**: a rug-pattern ribbon unrolls across the top on every page change, timelines draw their rail and
  pop their stops in, primary buttons throw lamp-dust where pressed, city cards tilt with a glare, the page-header
  route flows, and the planning pipeline has Journie riding the progress line.

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
- Landing details: `MagicCursor` (glow ring and a dust trail, mouse only; other components can scatter dust with the `journie:sparkle` window event), `WishLamp` in the hero (rub the lamp for a trip wish), a shooting star in the Saigon sky and a night-sky footer.
- Smoothness: Lenis is driven by motion's frame loop, scroll layers that move are promoted with `will-change`, only the active Explore photo is mounted (Ken Burns runs in CSS), and most animation is transform/opacity so it stays on the compositor. Avoid adding `backdrop-filter` or animated SVG attributes on large areas.
- The dark-background logo uses `journie-mark-light.png`, the lamp cropped from a recoloured copy of the lockup (forest green to paper). The wordmark is text, so only the lamp needs regenerating if the logo changes.
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
