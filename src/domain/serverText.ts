import type { Language } from '../types/i18n'

/**
 * The backend writes its section labels, reasons and warnings in Vietnamese only (journie-be `retrieval/scoring.py`, `hours.py`,
 * `sections.py`, `keyword_map.v1.yaml`). These read them in English. What the traveler typed stays as typed, and text not listed here
 * is shown unchanged.
 */
const LABELS: Record<string, string> = {
  'Bảo tàng': 'Museums',
  'Cà phê': 'Cafés',
  'Ẩm thực': 'Food',
  'Công viên': 'Parks',
  'Thiên nhiên': 'Nature',
  'Mua sắm': 'Shopping',
  'Văn hoá': 'Culture',
  'Biển': 'Beach',
  'Bar & nightlife': 'Bars & nightlife',
  'Đền chùa': 'Temples & pagodas',
  'Nhà thờ': 'Churches',
  'Địa điểm bạn thích': 'Places you like',
  'Sao Michelin': 'Michelin star',
  'Michelin 1 sao': 'Michelin one star',
  'Món chay': 'Vegetarian',
  'Thuần chay': 'Vegan',
  'Có món chay': 'Vegetarian options',
  'Hải sản': 'Seafood',
  'Món Việt': 'Vietnamese food',
  'Món Pháp': 'French food',
  'Món Nhật': 'Japanese food',
  'Món Thái': 'Thai food',
  'Món Hoa': 'Chinese food',
  'Ăn sáng / brunch': 'Breakfast / brunch',
  'Tiệm bánh': 'Bakery',
  'Bánh mì': 'Banh mi',
  'Ẩm thực Việt': 'Vietnamese cuisine',
  'Đặc sản vùng miền': 'Regional specialties',
  'Ẩm thực Pháp': 'French cuisine',
  'Ẩm thực châu Á': 'Asian cuisine',
  'Fusion châu Á': 'Asian fusion',
  'Ẩm thực Thái': 'Thai cuisine',
  'Ẩm thực Hoa': 'Chinese cuisine',
  'Ẩm thực Mỹ Latin': 'Latin American cuisine',
  'Quán ăn': 'Eatery',
  'Gợi ý theo mô tả': 'Suggested from its description',
  'Mở cửa 24/7': 'Open 24/7',
  'Tạm thời không tìm được theo ý nghĩa; sở thích tự do chỉ khớp theo từ': 'Search by meaning is unavailable for now, so free-text wishes match by word only',
  'Chưa rõ điểm đến; đang gợi ý địa điểm tại TP.HCM': 'No destination yet, so these are places in Ho Chi Minh City',
}

const WEEKDAYS: Record<string, string> = { 'thứ Hai': 'Monday', 'thứ Ba': 'Tuesday', 'thứ Tư': 'Wednesday', 'thứ Năm': 'Thursday', 'thứ Sáu': 'Friday', 'thứ Bảy': 'Saturday', 'Chủ nhật': 'Sunday' }

const PATTERNS: [RegExp, (...parts: string[]) => string][] = [
  [/^Mô tả có (“.*”)$/, (word) => `Description mentions ${word}`],
  [/^Khớp (“.*”)$/, (word) => `Matches ${word}`],
  [/^Được (\d+) nguồn giới thiệu$/, (count) => `Recommended by ${count} sources`],
  [/^Giá: (.*)$/, (price) => `Price: ${price}`],
  [/^Mở (.*) hằng ngày$/, (hours) => `Open ${hours} daily`],
  [/^Mở (.*) (thứ (?:Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ nhật)$/, (hours, day) => `Open ${hours} on ${WEEKDAYS[day]}`],
  [/^Không có dữ liệu cho (“.*”) ở thành phố này$/, (word) => `No data for ${word} in this city`],
  [/^Không tìm thấy địa điểm cho (“.*”)$/, (word) => `No places found for ${word}`],
  [/^(\d+) địa điểm vừa bắt buộc vừa cần tránh; vẫn giữ trong danh sách bắt buộc$/, (count) => `${count} places are both required and avoided, so they stay required`],
]

/** A label, reason or warning from the backend in the current language. */
export function serverText(text: string, language: Language): string {
  if (language === 'vi') return text
  if (LABELS[text]) return LABELS[text]
  for (const [pattern, write] of PATTERNS) {
    const hit = text.match(pattern)
    if (hit) return write(...hit.slice(1))
  }
  return text
}
