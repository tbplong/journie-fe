import type { CityId } from '../domain/types'

/**
 * Hand-written names for trips the traveler did not name (docs/specs/trip-naming.md, bank v2). A name is picked once,
 * when the trip is created, and stored; the card then adds "· N ngày". Edit freely: keep each line short, true to the
 * city, and give anything that names an area, a season or a dish a `when`, so it is only used when the plan matches.
 */
export type NameTheme = 'food' | 'night' | 'cafe' | 'history' | 'market' | 'green' | 'rain' | 'slow' | 'mixed'

/** Areas checked by the coordinates of the stops (Hanoi, Da Nang and Hue addresses carry no district) or the ward name. */
export type NameArea = 'cho-lon' | 'pho-co' | 'tay-ho'

export type NameWhen = {
  area?: NameArea
  /** Months of the start date, 1-12. */
  months?: number[]
  /** Starts on a Saturday or Sunday. */
  weekend?: boolean
  /** The trip was planned for rain. */
  rain?: boolean
  /** At least one bar or pub in the plan. */
  bar?: boolean
  /** Some stop's name matches (accents ignored), e.g. a phở shop. */
  dish?: 'pho' | 'mi-quang' | 'seafood'
}

export type TripName = { city: CityId; theme: NameTheme; vi: string; en: string; when?: NameWhen }

export const TRIP_NAMES: TripName[] = [
  // Sài Gòn
  { city: 'sai-gon', theme: 'food', vi: 'Ăn sập Sài Gòn', en: 'Eat your way through Saigon' },
  { city: 'sai-gon', theme: 'food', vi: 'Lê la vỉa hè Sài Gòn', en: 'Saigon sidewalk feasts' },
  { city: 'sai-gon', theme: 'food', vi: 'Sài Gòn, ăn tới bến', en: 'Saigon, one more bite' },
  { city: 'sai-gon', theme: 'food', vi: 'Chợ Lớn no say', en: 'Cholon, plate by plate', when: { area: 'cho-lon' } },
  { city: 'sai-gon', theme: 'night', vi: 'Sài Gòn lên đèn', en: 'Saigon lights up' },
  { city: 'sai-gon', theme: 'night', vi: 'Sài Gòn không ngủ', en: 'Saigon never sleeps' },
  { city: 'sai-gon', theme: 'night', vi: 'Sài Gòn, cụng ly!', en: 'Cheers, Saigon!', when: { bar: true } },
  { city: 'sai-gon', theme: 'cafe', vi: 'Sài Gòn, một ly sữa đá', en: 'Saigon, one iced coffee at a time' },
  { city: 'sai-gon', theme: 'cafe', vi: 'Cà phê bệt, phố cũ', en: 'Sidewalk coffee, old streets' },
  { city: 'sai-gon', theme: 'cafe', vi: 'Chậm lại cùng cà phê Sài Gòn', en: 'Slow down with Saigon coffee' },
  { city: 'sai-gon', theme: 'history', vi: 'Sài Gòn, những lớp thời gian', en: 'Saigon, layers of time' },
  { city: 'sai-gon', theme: 'history', vi: 'Ký ức Hòn ngọc Viễn Đông', en: 'Pearl of the Orient, remembered' },
  { city: 'sai-gon', theme: 'market', vi: 'Lạc giữa chợ Sài Gòn', en: "Lost in Saigon's markets" },
  { city: 'sai-gon', theme: 'market', vi: 'Sài Gòn chợ búa', en: 'Saigon market days' },
  { city: 'sai-gon', theme: 'rain', vi: 'Sài Gòn mưa rồi tạnh', en: 'Saigon, rain and shine' },
  { city: 'sai-gon', theme: 'rain', vi: 'Trốn mưa Sài Gòn', en: 'Hiding from the Saigon rain', when: { rain: true } },
  { city: 'sai-gon', theme: 'mixed', vi: 'Sài Gòn đủ vị', en: 'Saigon, all the flavours' },
  { city: 'sai-gon', theme: 'mixed', vi: 'Chào Sài Gòn', en: 'Hello, Saigon' },
  { city: 'sai-gon', theme: 'mixed', vi: 'Sài Gòn cuối tuần', en: 'A Saigon weekend', when: { weekend: true } },

  // Hà Nội
  { city: 'ha-noi', theme: 'mixed', vi: 'Lạc giữa băm sáu phố phường', en: 'Lost in the 36 streets', when: { area: 'pho-co' } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Một vòng phố cổ', en: 'Around the Old Quarter', when: { area: 'pho-co' } },
  { city: 'ha-noi', theme: 'night', vi: 'Đêm phố cổ', en: 'Old Quarter nights', when: { area: 'pho-co' } },
  { city: 'ha-noi', theme: 'food', vi: 'Hà Nội ăn quà', en: 'Hanoi street snacks' },
  { city: 'ha-noi', theme: 'food', vi: 'Ăn quà phố cổ', en: 'Snacking through the Old Quarter', when: { area: 'pho-co' } },
  { city: 'ha-noi', theme: 'food', vi: 'Hà Nội, bát phở sớm', en: 'Hanoi, an early bowl of pho', when: { dish: 'pho' } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Gió heo may Hà Nội', en: 'Hanoi in autumn', when: { months: [9, 10] } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Hà Nội mùa hoa sữa', en: 'Hanoi, milk flower season', when: { months: [10, 11] } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Hà Nội se lạnh', en: 'Crisp Hanoi days', when: { months: [12, 1, 2] } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Hà Nội mưa phùn', en: 'Hanoi drizzle', when: { months: [2, 3] } },
  { city: 'ha-noi', theme: 'history', vi: 'Thăng Long nghìn năm', en: 'A thousand years of Thang Long' },
  { city: 'ha-noi', theme: 'history', vi: 'Dấu xưa Thăng Long', en: 'Traces of old Thang Long' },
  { city: 'ha-noi', theme: 'cafe', vi: 'Cà phê vỉa hè Hà Nội', en: 'Sidewalk coffee, Hanoi' },
  { city: 'ha-noi', theme: 'cafe', vi: 'Hà Nội, ngồi một chút', en: 'Hanoi, sit a while' },
  { city: 'ha-noi', theme: 'night', vi: 'Hà Nội về khuya', en: 'Hanoi after hours' },
  { city: 'ha-noi', theme: 'night', vi: 'Hà Nội, cụng ly!', en: 'Cheers, Hanoi!', when: { bar: true } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Chiều Hồ Tây', en: 'West Lake afternoons', when: { area: 'tay-ho' } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Hồ Tây lộng gió', en: 'Breezy West Lake', when: { area: 'tay-ho' } },
  { city: 'ha-noi', theme: 'mixed', vi: 'Chào Hà Nội', en: 'Hello, Hanoi' },
  { city: 'ha-noi', theme: 'mixed', vi: 'Hà Nội thong dong', en: 'Hanoi at ease' },

  // Huế
  { city: 'hue', theme: 'history', vi: 'Nghe Huế kể chuyện xưa', en: 'Hue, old stories' },
  { city: 'hue', theme: 'history', vi: 'Chạm vào Cố đô', en: 'Touching the old capital' },
  { city: 'hue', theme: 'history', vi: 'Huế trầm mặc', en: 'Quiet, old Hue' },
  { city: 'hue', theme: 'slow', vi: 'Huế thong thả', en: 'Unhurried Hue' },
  { city: 'hue', theme: 'slow', vi: 'Huế chậm', en: 'Slow Hue' },
  { city: 'hue', theme: 'rain', vi: 'Huế mưa dầm', en: 'Hue in the rain' },
  { city: 'hue', theme: 'mixed', vi: 'Trú mưa xứ Huế', en: 'Sheltering from the rain in Hue', when: { months: [9, 10, 11, 12] } },
  { city: 'hue', theme: 'food', vi: 'Ăn Huế cho cay', en: 'Hue, the spicy way' },
  { city: 'hue', theme: 'food', vi: 'Xứ Huế, vị cay', en: 'Hue, a taste of chili' },
  { city: 'hue', theme: 'cafe', vi: 'Huế, cà phê và chậm', en: 'Coffee and slow days in Hue' },
  { city: 'hue', theme: 'night', vi: 'Huế về đêm', en: 'Hue after dark' },
  { city: 'hue', theme: 'mixed', vi: 'Huế thong thả', en: 'Unhurried Hue' },
  { city: 'hue', theme: 'mixed', vi: 'Chạm vào Cố đô', en: 'Touching the old capital' },

  // Đà Nẵng
  { city: 'da-nang', theme: 'night', vi: 'Đà Nẵng lên đèn', en: 'Da Nang lights up' },
  { city: 'da-nang', theme: 'night', vi: 'Đà Nẵng, cụng ly!', en: 'Cheers, Da Nang!', when: { bar: true } },
  { city: 'da-nang', theme: 'food', vi: 'Đà Nẵng no say', en: 'Da Nang, well fed' },
  { city: 'da-nang', theme: 'food', vi: 'Đà Nẵng, tô mì Quảng', en: 'Da Nang, a bowl of mi Quang', when: { dish: 'mi-quang' } },
  { city: 'da-nang', theme: 'food', vi: 'Đà Nẵng, vị biển', en: 'Da Nang seafood days', when: { dish: 'seafood' } },
  { city: 'da-nang', theme: 'cafe', vi: 'Đà Nẵng thong thả', en: 'Easy days in Da Nang' },
  { city: 'da-nang', theme: 'mixed', vi: 'Chào Đà Nẵng', en: 'Hello, Da Nang' },
  { city: 'da-nang', theme: 'mixed', vi: 'Đà Nẵng đáng sống', en: 'Da Nang, the liveable city' },
  { city: 'da-nang', theme: 'mixed', vi: 'Đà Nẵng cuối tuần', en: 'A Da Nang weekend', when: { weekend: true } },
]
