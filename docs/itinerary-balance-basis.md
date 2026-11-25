# How many places of each kind fit in a balanced Journie day

This document proposes how to compose one day of a Journie itinerary: how many meals, cafés, museums, outdoor sights, shopping stops and evening outings fit in a day for each pace, and where in the day each should go. It rests on sources that were opened and checked. Any number the sources do not give is marked as a team estimate.

> **Evidence available**
> - **Research supports the direction, not the numbers.** Fatigue builds up over a run of attractions, and fatigue-prone travellers need rest after one or two of them [S4]. The value of more places of a similar kind drops quickly [S5]. Category caps are a standard way to stop one kind of place filling a day [S24, S2]. A planner that only optimises fills about 97% of the day and leaves no rest [S9]. None of these sources gives a count of museums, cafés or meals per day.
> - **Timing within the day** comes from the official Vietnam tourism site [S18, S19, S20], travel guides [S16, S17, S22] and one thermal-comfort study from a hot, humid city in southern China [S14]. This is practitioner advice plus an analogue, not measured Vietnamese tourist behaviour.
> - **Vietnam:** no study of how tourists spend their day, pace themselves or tire was found for Hanoi, Ho Chi Minh City, Huế or Da Nang.
> - **Numbers in the pace table** (section 3) are team estimates anchored on that direction and on guide sample days. They should be checked against Live data (section 5).

---

## 1. Purpose

Journie's planners decide a day's places mostly from score, distance and opening hours, plus a few caps: total stops by pace, at most 3 meals, at most 2 cafés, at most 1 evening venue, and no two food stops in a row. Nothing stops a day from holding several museums or historic sites, from putting long outdoor walks in the midday heat, or from leaving no break. This document:

1. lists the sources checked and what each one can and cannot support (section 2);
2. proposes a daily composition by pace (section 3);
3. compares that with the current rules in `journie-be/app/services/routing/config/rules.yaml` and the frontend planner (`src/domain/planner.ts`, `src/domain/solver.ts`), and lists concrete rule changes (section 4);
4. lists what still has no good evidence (section 5).

Pace names: the frontend uses `slow`, `balanced` and `fast`. This document writes them as relaxed (`slow`), balanced and packed (`fast`), as in `visit-duration-basis.md`.

---

## 2. Verified sources

### 2.1. How the sources were checked

Each URL was opened on 24 November 2026. The title, authors, publisher and year were checked against the page, and every claim below was checked against the text that was read. The "Read" column says how much of each source was read: the full text, or only the abstract or summary page. A claim that could not be found in the text was removed or corrected (section 2.3). Quotes are under 15 words, with at most one per source.

Kinds: **peer-reviewed** (journal or refereed conference), **preprint** (arXiv with no venue), **official** (Vietnam National Authority of Tourism), **guide** (established travel publisher), **news**, **secondary** (encyclopedia summary).

### 2.2. Sources kept

**Itinerary models and category limits**

| # | Source | Kind | Read | What it supports |
|---|---|---|---|---|
| S1 | Gunawan, A., Lau, H. C., & Vansteenwegen, P. (2016). Orienteering Problem: a survey of recent variants, solution approaches and applications. *European Journal of Operational Research*, 255(2), 315–332. https://econpapers.repec.org/RePEc:eee:ejores:v:255:y:2016:i:2:p:315-332 | peer-reviewed | abstract | Names the (team) orienteering problem with time windows as a main variant and the Tourist Trip Design Problem as an application. This is the problem class Journie solves: opening hours, travel time and a day budget. It gives no composition rule. |
| S24 | Bolzoni, P., Helmer, S., Wellenzohn, K., Gamper, J., & Andritsos, P. (2014). Efficient Itinerary Planning with Category Constraints. *ACM SIGSPATIAL 2014*, 203–212. https://doi.org/10.1145/2666310.2666411 (PDF: https://ad-research.informatik.uni-freiburg.de/proceedings/SIGSPATIAL%202014/paper_full_bolzoni.pdf) | peer-reviewed | introduction | **Added in this check** as the peer-reviewed source for category caps. The authors give category limits on points of interest as a more realistic way to plan trips. Their motivating examples: a museum lover still should not get an itinerary of "five, six, or even more of them is not a good idea" (sensory overload), and someone who rates restaurants highly does not want a day made only of restaurants. These examples are the authors' reasoning, not a measurement. |
| S2 | Bolzoni, P., & Helmer, S. (2017). Solving Orienteering with Category Constraints Using Prioritized Search. arXiv:1702.04304. https://arxiv.org/abs/1702.04304 | preprint (downgraded) | full text (ar5iv) | Each place has exactly one category, and the traveller sets a maximum per category (Definition 2). In Example 2, an itinerary with a higher score (1.9 against 1.4) is rejected because it holds two places of one category while the cap is 1. The default experiments use a cap of 2 per category, which is a test setting, not a recommendation. The arXiv page gives no venue, so this is a preprint. A related paper by the same authors (Hybrid Best-First Greedy Search for Orienteering with Category Constraints, Springer 2017 proceedings, https://doi.org/10.1007/978-3-319-64367-0_2) was seen only in search results and was not opened. |
| S4 | Ko, T., Qureshi, A. G., Schmöcker, J.-D., & Fujii, S. (2019). Tourist Trip Design Problem considering Fatigue. *Journal of the Eastern Asia Society for Transportation Studies*, 13, 1233–1248. https://www.jstage.jst.go.jp/article/easts/13/0/13_1233/_article/-char/en | peer-reviewed | full text | Attractions raise fatigue and rest stops lower it. In the model, rest stops are clusters of restaurants near an attraction, given a basic meal break of 30 minutes in the test. As fatigue sensitivity rises, the best route has fewer attractions and more rest stops. A fatigue-prone traveller (the authors mention older people and large families) "might need to seek a resting place after just one or two attractions". A route planned without fatigue gives such a traveller very low utility. Limits: the parameters are assumed and tuned by sensitivity analysis on one Kyoto test with 10 attractions. Nothing is calibrated on tourists. |
| S5 | Shen, K., Schmöcker, J.-D., Sun, W., & Qureshi, A. G. (2022). Calibration of sightseeing tour choices considering multiple decision criteria with diminishing reward. *Transportation*. https://doi.org/10.1007/s11116-022-10296-7 (open copy: https://pmc.ncbi.nlm.nih.gov/articles/PMC9146821/) | peer-reviewed | full text | Kyoto survey: 1,265 usable tours from 3,456 responses. 28% of tours visited 2 areas and 26% visited 3, with a mean of 2.8 and a maximum of 7. An **area** is one of 37 zones around one or several main sights, not one place, so these counts do not limit stops. The reward of further visits shrinks **within each utility category** (temples and shrines with autumn leaves, gourmet, and leisure: shops, museums, art centres). The gain drops quickly after about one or two places. Ignoring this overestimates how many attractions people visit. |
| S9 | Adamo, T., Colizzi, L., Dimauro, G., Ghiani, G., & Guerriero, E. (2022). A multimodal tourist trip planner integrating road and pedestrian networks. arXiv:2207.00097. https://arxiv.org/abs/2207.00097. Published as *Expert Systems with Applications*, 237, 121457 (2024), according to the dblp record. | peer-reviewed | full text (arXiv version) | In optimised plans with a 12-hour day budget, visiting takes about 70% of the time, walking about 6%, driving about 20% and waiting under 1.5%. The model has no lunch, rest or category rule. A pure optimiser therefore fills the day, so rest has to be an explicit rule. The figures were read in the arXiv version. |
| S10 | Ibáñez-Ruiz, J., Sebastiá, L., & Onaindia, E. (2017). Evaluating the quality of tourist agendas customized to different travel styles. *COPLAS'17 workshop*. arXiv:1706.05518. https://arxiv.org/abs/1706.05518 | peer-reviewed (workshop) | abstract | Defines travel style by three things: the rhythm of the trip, the number of visits, and the priority given to places of special interest. This supports pace as a setting that changes both counts and rest. It gives no numbers. |

**Fatigue, pace and daily patterns**

| # | Source | Kind | Read | What it supports |
|---|---|---|---|---|
| S6 | Su, X., Sun, J., Duan, X., & Zhang, J. (2024). Unpacking tourism fatigue: travel frequency, duration and its effects on satisfaction and revisit intention. *Current Issues in Tourism*, 27(18), 3043–3059. https://ideas.repec.org/a/taf/rcitxx/v27y2024i18p3043-3059.html | peer-reviewed | abstract | Two waves of surveys, at a nature destination and a culture destination. Trip duration mainly drives physical fatigue, and travel frequency drives psychological fatigue. Physical fatigue makes psychological fatigue worse, and psychological fatigue clearly lowers satisfaction. **This is about trips, not single days.** It supports spreading the load over a multi-day trip (R11) more than a cap within one day. |
| S7 | Li, C., Yang, Y., Zhang, H., & Zhang, Z. (2025). Fast or slow? Exploring tourists' engagement inclination toward the pace of travel. *Annals of Tourism Research*, 111, 103931. https://ideas.repec.org/a/eee/anture/v111y2025ics0160738325000374.html | peer-reviewed | abstract | Six studies. Tourists who feel busier lean towards slow travel, and a need for recovery explains this. Message framing and cultural background change the strength of the effect. Supports offering a relaxed pace and a recovery slot. It gives no numbers. |
| S8 | Grinberger, A. Y., & Shoval, N. (2019). Spatiotemporal Contingencies in Tourists' Intradiurnal Mobility Patterns. *Journal of Travel Research*, 58(3), 512–530. https://cris.huji.ac.il/en/publications/spatiotemporal-contingencies-in-tourists-intradiurnal-mobility-pa/ | peer-reviewed | abstract | Smartphone tracking of 384 tourist-days in Tel Aviv and Jerusalem found three distinct daily time-space patterns. Personal and external factors decide which pattern a tourist follows, and the effects depend on each other. Supports templates by pace rather than one fixed shape for every day. It gives no counts or minutes. |
| S11 | Krukar, J., & Dalton, R. C. (2020). How the Visitors' Cognitive Engagement Is Driven (but Not Dictated) by the Visibility and Co-visibility of Art Exhibits. *Frontiers in Psychology*, 11, 350. https://www.frontiersin.org/articles/10.3389/fpsyg.2020.00350/full | peer-reviewed | introduction | Literature review. In Melton's studies (1935), people stopped at fewer paintings as the number of works grew, while time per painting stayed near 10 seconds. Serrell found that larger exhibitions are walked through faster. Smith and Smith found a first look of under 10 seconds, then about 30 seconds per picture. The authors infer a limited budget of engagement time per visit. All of this happens **within one visit**. Applying it across several museums in a day is the team's extrapolation. |
| S12 | Serrell, B. (2010, edited 2016). Paying More Attention to Paying Attention. informalscience.org. https://informalscience.org/paying-more-attention-paying-attention/ | guide (practitioner research summary by the author of the database) | full page | Serrell's tracking database shows an average visit of about 20 minutes **per exhibition**, not per museum. The share of "diligent visitors" (people who stopped at more than half the elements) averages about 26%. 12 of the 14 least-used exhibitions had more than 50 elements, and smaller exhibitions are explored more fully. Quote: "Temporary exhibitions with more than 50 elements can be overwhelming". |
| S13 | Wikipedia (accessed 2026). Museum fatigue. https://en.wikipedia.org/wiki/Museum_fatigue | secondary (downgraded) | full page | Background only. Falk et al. (1985) saw high interest for about 30 minutes, then a decline. Serrell saw apathy within 20 minutes. Bitgood (2009) lists exhaustion, satiation, object competition, information overload and limited attention. Museum shops, cafés and seating help visitors take breaks. The primary sources were not opened. |

**Heat and time of day**

| # | Source | Kind | Read | What it supports |
|---|---|---|---|---|
| S14 | Zhang, L., Ma, X., Zhao, J., & Wang, M. (2019). Tourists' Thermal Experience and Health in a Commercial Pedestrianized Block: A Case Study in a Hot and Humid Region of Southern China. *IJERPH*, 16(24), 5072. https://pmc.ncbi.nlm.nih.gov/articles/PMC6950360/ | peer-reviewed | full text | Foshan, China, on the hottest day of summer 2016 (24 July), at 7 measured points in one pedestrian block, with an ENVI-met simulation and no tourist survey. Nearly all points were suitable for visiting at 08:00–09:00. The whole block was hot or very hot from 10:00 to 19:00, and easy to visit again after 19:00. This is a hot-humid analogue for Vietnam, not Vietnamese data. It does **not** support a cooler late afternoon before 19:00. |
| S15 | Hoang Phong (26 May 2026). Foreign tourists struggle as Hanoi temperatures top 40 C. *VnExpress International*. https://e.vnexpress.net/news/travel/foreign-tourists-struggle-as-hanoi-temperatures-top-40-c-vnepre-5078499.html | news | full page | Hanoi reached 40.7 °C on 25 May 2026. Foreign visitors cut back on outdoor activity, went to pools, and looked for indoor activities, especially in the afternoon. This is anecdotal evidence of behaviour. |

**Vietnam practice (official site and guides)**

| # | Source | Kind | Read | What it supports |
|---|---|---|---|---|
| S16 | Rough Guides (byline dated 13 January 2026). Vietnam itinerary (7, 10 & 14 days). https://www.roughguides.com/vietnam/itineraries/ | guide | full page | Ho Chi Minh City days hold about 3 sights (10-day plan, arrival day) to about 5 (14-day plan), with evenings for a Vespa tour, street food or night markets. A Huế day covers the Imperial Citadel, the Royal Museum and Thiên Mụ Pagoda. The wet season brings short, heavy afternoon showers, so the guide suggests mornings for sightseeing and cafés, cooking classes or museums on rainy days. The densest Hanoi day has about 6 stops. After an emotionally heavy site (the Vinh Moc tunnels), it advises a light evening. Da Nang appears only as a transit point. |
| S17 | Rough Guides (undated, © 2026, wording partly older). Ho Chi Minh City. https://www.roughguides.com/vietnam/ho-chi-minh-city-and-around/ | guide | full page | Shops open from about 10:00 to dusk, and larger stores often stay open past 20:00. Simple rice and noodle eateries are busiest at lunch. Cafés suit a coffee earlier in the day, and dessert after dinner. Water-puppet shows are in the early evening. A crackdown on late opening means most places close around midnight, except around Đề Thám. Hours may be out of date. |
| S18 | Vietnam National Authority of Tourism (undated). A beginner's guide to Vietnamese street food. https://vietnam.travel/things-to-do/beginners-guide-vietnamese-street-food/ | official | full page | The daily rhythm of street food: noodles, porridge and sticky rice just after sunrise. Lunch stalls run from 11:30 to 13:00. Sidewalk stools go out around 17:00, and 18:00–20:00 is the best time for hotpot, grilled seafood and barbecue. Good food is harder to find between mealtimes. |
| S19 | Vietnam National Authority of Tourism (undated). 3 days in Huế for culture seekers. https://vietnam.travel/things-to-do/hue-itinerary/ | official | full page | Day 1: in the morning, four short photo stops, then the Imperial City (about two hours). Day 2: two main morning stops, a rest after lunch, then Thiên Mụ just before sunset. Day 3: a beach morning, a seafood lunch, a return to the hotel to rest, then a short afternoon (Hến Island takes under half an hour). Of the royal tombs, it advises picking two or three, not all. Day 1 has no rest after lunch and Day 3 lists no dinner. It gives no heat advice. |
| S20 | Vietnam National Authority of Tourism (undated). A taste of Vietnam: the story behind its beloved coffee culture. https://vietnam.travel/things-to-do/taste-vietnam-story-behind-its-beloved-coffee-culture/ | official | full page | Coffee is described as "a slow, deeply sensory cultural ritual", served from early morning to late night. Sidewalk cafés work as shared living rooms where people sit and watch the street. It gives no durations. Supports treating a café as a sit-down break rather than a quick sight. |
| S21 | Vietnam National Authority of Tourism (undated). Enjoy the great outdoors in Ho Chi Minh City. https://vietnam.travel/things-to-do/enjoy-great-outdoors-ho-chi-minh-city/ | official (downgraded) | full page | Only seven separate options, **not** a day plan. It presents parks as places for a break between sights, gives the city's average as 26–27 °C, says the city gets sticky, and suggests a water park to cool off. Weak support for a midday rest at a park. |
| S22 | Sinha, S. (3 June 2019). The ultimate weekend itinerary: Ho Chi Minh City. *National Geographic Travel*. https://www.nationalgeographic.com/travel/article/saigon-ultimate-weekend-itinerary | guide | full page | An example of a packed day. Day 1 has 8 stops: a café at 11:00, three French Quarter sights from 12:00, a landmark at 14:00, Bến Thành market at 15:00, a four-hour street-food walk from 18:00, and a foot massage at 22:00. Day 2: coffee at 08:00, a park at 08:30, craft beer at 12:00, a village at 14:00, pagodas and a canal walk at 16:00, and bars from 18:00. Neither day names a lunch or dinner, and the outdoor walking falls at midday. It shows what an unchecked packed day looks like. Written before 2020. |
| S23 | VietnamNet (21 February 2023). Night economy: new driving force for Vietnam tourism. https://vietnamnet.vn/en/night-economy-new-driving-force-for-vietnam-tourism-2112043.html | news (downgraded) | full page | Night areas: Hanoi's Old Quarter and Hoàn Kiếm, Trịnh Công Sơn and Sơn Tây pedestrian streets. Ho Chi Minh City's Bùi Viện and Nguyễn Huệ. Da Nang's An Thượng street, the Bạch Đằng route and Bà Nà Hills. The article names Huế only as a priority, with no details. It cites the Ministry of Planning and Investment for about 20 night markets in Vietnam. Its statement that night services run "from 2pm" is contradicted by S25, and its 70% night-spending figure comes from a tour-company chairman, so neither is used. |
| S25 | Vietnam Law & Legal Forum magazine (8 July 2020). News item on Decision 1129/QĐ-TTg on the night-time economy. https://vietnamlawmagazine.vn/dust-to-dawn-services-finally-get-green-light-27301.html | news (legal) | full page | **Added in this check.** Decision 1129/QĐ-TTg covers night-time services from 18:00 to 06:00 the next day. Journie's `not_before` nightlife rule of 18:00 matches this national definition. |

### 2.3. Dropped and corrected claims

**Dropped source**
- **S3** (Tang et al., ITINERA, EMNLP 2024 Industry Track, arXiv:2402.07204). The paper exists and is close to Journie's design: an LLM reads the request and a spatial optimiser orders the places. But its only claim about composition (avoiding restaurant visits back to back) is not in the abstract, and no rule depends on its architecture. It is no longer cited as evidence.

**Corrected or removed claims**

| Source | Earlier claim | After checking |
|---|---|---|
| S2 | Peer-reviewed | The arXiv page has no venue, so it is a preprint. S24 is the peer-reviewed source for category caps. |
| S4 | Only the abstract was read, so the point about high-sensitivity travellers was unverified | The full text confirms it: fewer attractions, more rest stops, and rest possibly after one or two attractions. The rest stops are clusters of restaurants. |
| S5 | "Most tours cover 2–3 places" | They cover **areas** (zones around one or several main sights). The diminishing reward applies per utility category. |
| S6 | "A heavy schedule costs satisfaction" | The study links fatigue to the length and frequency of trips, not to the density of a day. Moved to R11. |
| S8 | "Cognitive, social and cultural factors" | The abstract names only personal and external factors, whose effects depend on each other. |
| S9 | arXiv only | Also published in *Expert Systems with Applications* 237 (2024), 121457, according to dblp. |
| S12 | "After about 20 minutes most visitors are ready to move on" | Not on the page. Removed. |
| S15 | Year 2024 | The article is dated 26 May 2026. |
| S16 | "HCMC days hold two or three attractions" and "Hanoi's densest day has about seven stops" | HCMC days hold about 3 to 5 sights, and the densest Hanoi day has about 6 stops. |
| S17 | "Reunification Palace gate closes at 4pm" | Not on the page. Removed. The page does say that visits are by group tour. |
| S19 | "Each day runs morning, lunch, rest, afternoon, dinner" and "about 5 light stops fit before lunch" | Only Days 2 and 3 have a rest after lunch, and Day 3 lists no dinner. Day 1's morning was four short photo stops plus the two-hour Imperial City. That does not show that five light stops are a norm. |
| S21 | "Suggested shape of a day: outdoor morning, midday park rest, water park, evening tour" | The page lists separate options and gives no day plan. Downgraded. |
| S22 | Year 2023 | Published 3 June 2019. |
| S23 | Year 2022, and "night services from 2pm to 6am" | Dated 21 February 2023. Decision 1129 covers 18:00–06:00 [S25]. |
| R5 | "Avoid 11:00–15:00, especially March to May" | No source gives months for each city. Use a temperature forecast flag instead of a calendar. |

---

## 3. Proposed daily composition by pace

### 3.1. Definitions

- **Heavy stop:** a stop that is not food, not a café and not an evening venue, with a planned visit of 60 minutes or more. With `visit-minutes-v1` this covers museums (90), galleries (60), zoos, theme parks, malls (90), markets and department stores (60), and any tier-A landmark or historic site whose visit rounds up to 60. Meals have to be excluded explicitly, because a restaurant's typical visit is 60 minutes and would otherwise count as heavy. This definition is a team estimate.
- **Museum-type stop:** `attraction.museum` or `attraction.gallery`. In the frontend, both carry the `museum` tag (`src/domain/poiFromCard.ts:48-49`).
- **Outdoor stop:** any stop whose category is not in the frontend's `INDOOR` set (`src/domain/poiFromCard.ts:43`).
- **Midday rest:** within 12:00–15:30, unscheduled time, a café, a park, or a return to the hotel. A lunch that runs past 60 minutes counts only for the extra minutes. This is a team estimate.
- **Busy share:** the share of the day spent visiting or travelling, as in `balance_tolerance`: (visits + travel) / day length.

### 3.2. Table

Cells give the proposed value and its sources. "team" means the number itself is a team estimate, and the sources support only the direction.

| Component | Relaxed (`slow`) | Balanced | Packed (`fast`) |
|---|---|---|---|
| All stops, meals and cafés included | 4 [S10, S16, S19; team] | 6 [S16, S19; team] | 8 [S22, S9; team] |
| Heavy stops | at most 1 [S4, S5; team] | at most 2 [S4, S5, S16; team] | at most 3, and at least 3 of the 8 stops short (30 min or less) or meals [S4, S22; team] |
| Museum-type stops | at most 1 [S24, S5, S11] | at most 2, never back to back [S24, S2, S5] | at most 2, never back to back [S24, S2, S5] |
| Sit-down meals | lunch and dinner; breakfast only when the day starts before 09:30 [S18, S19] | 2–3 [S18] | up to 3, the third a street-food stop of 30 min or less [S18, S22; team] |
| Meal windows (all paces) | lunch 11:00–14:00, best 11:30–13:00. Dinner 17:30–20:30, best 18:00–20:00 [S18, S17] | same | same |
| Cafés | at most 1 [S4, S20; team] | at most 2 [S4, S20, S17] | at most 2, the second 30 min or less [S20; team] |
| Outdoor stops starting 11:00–15:00 | none [S14, S15, S16] | at most 1 [S14, S16; team] | at most 1, followed by an indoor stop or a rest [S14, S4; team] |
| Best outdoor times (all paces) | before about 10:30 [S14, S16, S19]. Late afternoon to sunset [S19, S16]; S14 does **not** support this second window | same | same |
| Midday rest, 12:00–15:30 | 90 min or more [S19, S4, S7; team] | 60 min or more [S19, S4; team] | 45 min or more [S4, S9; team] |
| Main shopping stop (mall, department store, large market) | 0 or 1 [S17; team] | 1 [S17; team] | up to 2, the second an evening market [S17, S22; team] |
| Evening out (not before 18:00) | 0 or 1, with the day over by about 22:00 [S17, S25; team] | 1 [S17, S22, S25] | 1, more only when the traveller asks [S22, S25] |
| Busy-share ceiling (backstop) | 60% [S9; team] | 70% [S9; team] | 80% [S9; team] |

### 3.3. Order within the day (all paces)

Morning: an outdoor or heritage visit, with the day's most important sight first. Then lunch. Through the hot middle of the day: indoor stops (museum, mall, café) or the midday rest. Late afternoon: an outdoor sight, a market or a viewpoint. Then dinner, then the evening out. A relaxed day may drop the late-afternoon block [S14, S15, S16, S19, S21].

The case for the most important sight first is an inference from the fatigue model, in which fatigue builds up over a run of attractions [S4]. No study tests this order of the day for Vietnam. **This is practitioner advice.** S22 is a counter-example: it puts its French Quarter walk at midday.

### 3.4. Between days

Spread heavy stops, museums and evening outings evenly so that no single day carries the load. Fatigue grows with the length of a trip and lowers satisfaction [S6], and the gain from similar places drops within each category [S5]. After an emotionally heavy visit, such as a war site, keep the evening light. That advice comes from one guide [S16].

### 3.5. City notes (practitioner advice only)

| City | Shape | Sources |
|---|---|---|
| Ho Chi Minh City | 3–5 sights, plus food and one evening block (street food, a night market or a Vespa tour) | S16, S22, S17 |
| Huế | One large morning site (the Imperial City takes about 2 h and is a heavy stop), a rest after lunch, and a lighter site before sunset (Thiên Mụ). Choose 2–3 royal tombs, not all of them. | S19, S16 |
| Hanoi | Dense: up to about 6 stops, but only on packed days | S16 |
| Da Nang | No guide gives a day shape, so use the general rules | S16 (absence) |

---

## 4. Comparison with Journie's current rules

### 4.1. What Journie does today

**Backend** (`journie-be/app/services/routing/config/rules.yaml`, `rules-v3`, loaded by `load_rules` in `rules.py`). All rules are soft: one is broken only when the traveller's own places leave no other way, and the break is reported in `warnings`.
- `day_max`: `food.cafe: 2`, `entertainment.nightlife: 1`
- `day_spread`: `food.restaurant` (counts differ by at most 1 between days)
- `not_adjacent`: `food` (covers restaurants and cafés)
- `not_before`: `entertainment.nightlife: "18:00"`
- `meal_hours`: only for `food.restaurant`, windows 06:30–09:30, 11:00–14:00 and 17:30–20:30, with a penalty of 20 minutes
- `balance_tolerance: 0.15`. This compares days with each other and sets no absolute cap.
- The routing request carries **no pace**. The backend has no rule for heavy stops, museums, shopping, outdoor timing, rest, or a missing lunch.
- `load_rules` reads only these keys, so any new block in the file is ignored safely until code reads it.

**Frontend** (`src/domain/solver.ts`, `src/domain/planner.ts`, `src/api/planner.ts`)
- `MAX_STOPS` is slow 4, balanced 6, fast 8 (`solver.ts:17`), overridden by `stopsPerDay` (`planner.ts:47`).
- `MAX_MEALS` is 3 and `MEAL_GAP` is 150 min (`solver.ts:24, 36`). `MEAL_BONUS` is 7 for a lunch and for a dinner, split at 15:00 (`solver.ts:22, 215-216`). The lunch slot is 11:00–13:45 and the dinner slot is 17:30–20:30 (`isMealSlot`, `solver.ts:84-86`), which is not quite the backend's lunch window of 11:00–14:00.
- `MAX_CAFES` is 2 for every pace. No two food or café stops in a row while another kind of place still fits (`solver.ts:192-199`).
- `MAX_NIGHTLIFE` is 1, `EVENING_START` is 18:00, and `nightsPerDay` can override the cap (`solver.ts:26, 30`, `planner.ts:179`).
- The day runs from 08:00 to 21:00 by default (`intentFromExtraction.ts:34-35`). A new trip with an evening out runs from 10:00 (14:00 if every place is a night venue) to 23:30 (`src/api/planner.ts:113-139`).
- During a replan for heavy rain, `rainWindow` bans starting an outdoor stop inside the window, and rainy days favour indoor places (`solver.ts:56, 155`, `replan.ts:84-106`). The planner does not use heat.
- `MAX_WAIT` is 75 min. There is no required rest and no ceiling on busy share.

### 4.2. Rule by rule

| Rule | Evidence after checking | Journie today | Suggested change |
|---|---|---|---|
| **R1** Heavy-stop cap by pace | Research supports the direction [S4, S5, S9; S24 as reasoning]. The counts are a team estimate. | Only the total of 4/6/8. Six museums and historic sites can share a day. | Keep 4/6/8. Add a heavy cap of 1/2/3, using the definition in 3.1 with food and evening venues excluded. |
| **R2** Meals | Practitioner advice for timing [S18, S19, S17]. The counts are a team estimate. | 3 meals, a 150-min gap, meal windows on restaurants only, and a frontend bonus for lunch and dinner. The backend has no rule that a day must include lunch. | Keep `MAX_MEALS` 3, `MEAL_GAP` 150 and the windows. Add `food.street_food` and `food.food_court` to `meal_hours.nodes`; the frontend already treats street food as a meal (`isMealSlot`). Align the frontend's 13:45 lunch cut-off with the backend's 14:00. Optionally, add a soft penalty in the backend for a day of 6 hours or more with no lunch. |
| **R3** Cafés are breaks | Model and practitioner support [S4, S20, S17]. The caps by pace are a team estimate. | A cap of 2 at every pace. `not_adjacent: food` forbids a café straight after a meal. | Cap cafés at 1/2/2 by pace. Do not count a café as heavy. Optionally, allow one café straight after lunch as the midday rest, since S17 and S19 place a break right after a meal. This needs code, because `not_adjacent` has no exceptions. |
| **R4** Museums | Research supports the direction [S24, S2, S5]. Fatigue within a single visit is documented [S11, S12, S13]; carrying it across museums is the team's extrapolation. Putting museums in the midday heat or on rainy days is practitioner advice [S16, S15]. | No cap and no adjacency rule. | Cap museum-type stops at 1/2/2 and never put two back to back (yaml in 4.3). The earlier idea of a 2.5-hour daily museum total is dropped, since no source supports it. |
| **R5** Outdoor stops outside the midday heat | An analogue study plus practitioner advice [S14, S15, S16, S19]. The 11:00–15:00 window is a cautious team choice; S14 measured heat from 10:00 to 19:00. | No time-of-day rule for sights. Rain is handled by a hard ban during replans. | A **soft** penalty, like `meal_hours`, for an outdoor stop that starts between 11:00 and 15:00. Widen it to 10:00–16:00 when the forecast is hot (team estimate). Do not reuse the hard `rainWindow` ban. |
| **R6** Evening out | Practitioner advice and the legal definition [S17, S18, S22, S25]. | Already in place: 1 a day, not before 18:00, and a later start and end for trips with a night out. | No change. Keep `not_before` at 18:00, which matches Decision 1129 [S25]. The cut-off of no new evening venue after 22:00 unless asked is a team estimate. |
| **R7** Shopping | The weakest rule. Only shop hours are sourced [S17]. Shops fall in S5's leisure category. The count is a team estimate. | No cap and no time rule. | `day_max: shopping.mall: 1`. A mall works as a midday indoor stop and a market in the late afternoon or evening. Allow up to 2 shopping stops on packed days only. |
| **R8** Variety | Research supports the direction [S24, S2, S5]. The limit of 2 of one kind in a row is a team estimate. | Only `not_adjacent: food`. | Add `attraction.museum` and `attraction.gallery` to `not_adjacent`. Optionally, add a soft limit of 2 stops in a row of one top-level kind (needs code). S3 is no longer cited. |
| **R9** Rest and slack | Research supports the direction [S4, S7, S9]. Practitioner advice supports a midday rest [S19, S21]. The minutes and percentages are a team estimate. | No required rest. `balance_tolerance` sets only a relative limit. | Add a midday rest of 90/60/45 min by pace, which a café, a park or free time can fill. The busy-share ceilings of 60/70/80% would rarely bite, so the rest gap does the work. A rough team calculation with visit-minutes-v1 and about 20 min per hop on an 08:00–21:00 day gives about 45% busy for a relaxed day, 55% for a balanced day and 70% for a packed day. Measure real plans before choosing the ceilings. |
| **R10** Order of the day | Practitioner advice and an analogue [S14, S15, S16, S19]. Putting the main sight first is inferred from the model [S4]. | No ordering rule. | Optional soft bonus for the order outdoor, then meal, then indoor, then outdoor, then meal, then evening. Lowest priority; add it only after R5 and R9. |
| **R11** Between days | Research supports the direction [S6, S5]. The light evening after a heavy site is one guide's advice [S16]. | `day_spread` for restaurants only. | Add `attraction.museum` to `day_spread`. Keep `balance_tolerance` at 0.15. |
| **R12** City shapes | Practitioner advice only [S16, S19]. Da Nang has no source. | One set of limits for all four cities. | Defer. If added, mark Huế's Imperial City as heavy (an official 2-hour visit) and limit Huế's royal tombs to 2–3 per trip. |

### 4.3. Concrete changes

**(a) `rules.yaml` edits that the current loader already reads** (no code change). The backend has no pace, so these use the balanced values. Each rule stays soft.

```yaml
version: rules-v4
day_max:
  food.cafe: 2
  entertainment.nightlife: 1
  attraction.museum: 1        # new: with the gallery line, at most 2 museum-type stops a day [S24, S2, S5]
  attraction.gallery: 1       # new
  shopping.mall: 1            # new; weakest evidence, hours only [S17]
day_spread:
  - food.restaurant
  - attraction.museum         # new: spread museums over the trip [S5, S6]
not_adjacent:
  - food
  - attraction.museum         # new: no two museums in a row [S24, S2, S5]
  - attraction.gallery        # new
not_before:
  entertainment.nightlife: "18:00"   # matches the 18:00-06:00 national definition [S25]
meal_hours:
  nodes: [food.restaurant, food.street_food, food.food_court]   # street food follows the same meal rhythm [S18]
  windows: ["06:30-09:30", "11:00-14:00", "17:30-20:30"]
  penalty_minutes: 20
balance_tolerance: 0.15
```

Notes:
- `Rules.tag` takes the **first** `not_adjacent` node that covers a category. Never list both a parent and its child (for example `attraction` and `attraction.museum`). With separate museum and gallery entries, a museum followed by a gallery is still allowed. That is intended, because a small gallery is a lighter stop.
- `day_max` counts overlap safely, because each node is counted on its own.

**(b) New blocks that need code** (`load_rules` ignores them until code reads them). The frontend should come first, since only it knows the pace.

```yaml
pace_limits:                 # numbers are team estimates; sources in section 3.2
  slow:     {stops: 4, heavy: 1, museums: 1, cafes: 1, shopping: 1, outdoor_midday: 0, rest_gap_min: 90, busy_max: 0.60}
  balanced: {stops: 6, heavy: 2, museums: 2, cafes: 2, shopping: 1, outdoor_midday: 1, rest_gap_min: 60, busy_max: 0.70}
  fast:     {stops: 8, heavy: 3, museums: 2, cafes: 2, shopping: 2, outdoor_midday: 1, rest_gap_min: 45, busy_max: 0.80}
heavy_stop:
  min_visit_minutes: 60
  exclude: [food, entertainment]   # a restaurant's typical 60 min must not count as heavy
outdoor_hours:                     # soft, priced like meal_hours [S14, S15, S16, S19]
  avoid: "11:00-15:00"
  avoid_when_hot: "10:00-16:00"
  penalty_minutes: 20
rest_window: "12:00-15:30"         # [S4, S7, S19]
```

**(c) Frontend changes** (`src/domain/solver.ts`, `src/domain/planner.ts`)
1. Make `MAX_CAFES` depend on pace: slow 1, balanced 2, fast 2 [S4, S20].
2. Add `MAX_HEAVY` with slow 1, balanced 2, fast 3. A stop is heavy when its `cat` is not `food`, `cafe` or `nightlife`, it is not `evening`, and its `visit` is 60 or more [S4, S5, S9].
3. Add `MAX_MUSEUMS` with slow 1, balanced 2, fast 2, counted on the `museum` tag. Never schedule two `museum`-tagged stops back to back. Use the same check as the food-adjacency rule in the `varied` branch at `solver.ts:193-199` [S24, S2, S5].
4. Add a soft penalty in the objective at `solver.ts:163` for each stop that is not `indoor` and starts inside 11:00–15:00, widened on a hot day using the weather already read in `domain/conditions.ts` [S14, S15, S16].
5. Add a soft penalty when a day has no rest gap of `rest_gap_min` inside 12:00–15:30 [S4, S9, S19].
6. Align `isMealSlot`'s lunch cut-off (13:45) with the backend's 14:00 [S18].

---

## 5. What has no good evidence

- **No source gives counts per day.** No peer-reviewed source or official guide says how many museums, cafés, meals, shopping stops or heavy stops suit a tourist. Every count in section 3 is a team estimate anchored on direction: fatigue [S4], diminishing reward [S5], category caps [S24, S2], plans that fill the whole day [S9], and guide sample days [S16, S19, S22].
- **No data on Vietnam.** No study was found of how tourists spend their time, pace themselves or tire in Vietnam. The closest are Kyoto [S4, S5] and Israel [S8].
- **Heat by hour in Vietnamese cities.** The 10:00–19:00 hot window comes from one day in one block in Foshan [S14]. A study of a street canyon in Huế (Scheuer et al., 2024, *Urban Science* 8(2):67) was found but could not be opened (HTTP 403). The 11:00–15:00 window to avoid is a cautious team choice, and the late-afternoon outdoor window rests only on guides [S16, S19].
- **Museum fatigue across a day.** The 10-second, 20-minute and 30-minute figures describe single exhibitions or single visits [S11, S12, S13]. The primary sources (Bitgood 2009; Serrell 1998; Falk et al. 1985) were not opened. Nothing measures fatigue across several museums in one day.
- **How long a rest should be, and where.** S4 assumes a 30-minute meal break and S19 shows rests after lunch, but no source gives a measured length for a midday rest.
- **Cafés and shopping.** No source gives café minutes or the number of shopping stops per day. Café minutes stay as in `visit-duration-basis.md`.
- **The first and last day, children and older travellers.** No source covers arrival and departure days. S4 names older people and larger families as fatigue-prone but gives no adjustment.
- **Da Nang and Huế at night.** No guide gives a day shape for Da Nang, and no source describes what Huế offers at night [S16, S23]. Hanoi's weekend night-market hours were not confirmed from an official page, so they need checking place by place in journie-data.
- **Order of the day.** No study tests the order outdoor, then indoor, then outdoor for Vietnam. S22 does the opposite.
- **Sources not read in full.** S1, S6, S7, S8 and S10 were read as abstracts only. The Rough Guides HCMC page [S17] and the vietnam.travel pages [S18–S21] are undated. Survey papers behind paywalls (Gavalas et al. 2014; Vansteenwegen's mobile tourist guide work; Ruiz-Meza and Montoya-Torres 2022) were not opened, and Lonely Planet and Rick Steves returned HTTP 403 to the first researcher.

### How to close the gaps

With Live mode on, log for each day the number of heavy stops, the museum-type stops, outdoor starts between 11:00 and 15:00, the longest gap between 12:00 and 15:30, and busy share. Join these with the end-of-day question already proposed in `visit-duration-basis.md` ("Did the plan leave enough time?") and with stops that were skipped. Change a cap when the share of days with skipped stops or a "too tired" answer rises above it. Until then, treat every number in section 3 as a starting value.
