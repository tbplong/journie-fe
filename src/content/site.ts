import haGiangImage from '../assets/images/ha-giang.jpg'
import haLongImage from '../assets/images/ha-long.jpg'
import hoChiMinhCityImage from '../assets/images/ho-chi-minh-city.jpg'
import hoiAnImage from '../assets/images/hoi-an.jpg'
import logoLockup from '../assets/images/journie-lockup.png'
import logoMark from '../assets/images/journie-mark.png'
import ninhBinhImage from '../assets/images/ninh-binh.jpg'
import phuQuocImage from '../assets/images/phu-quoc.jpg'

const configuredName = import.meta.env.VITE_SITE_NAME?.trim()

export const siteConfig = {
  name: configuredName || 'Journie',
  description:
    'Nền tảng lập kế hoạch du lịch Việt Nam cá nhân hóa và linh hoạt thích ứng cùng AI.',
  brandStory: 'Journey gặp Genie: một người bạn đồng hành biến ý tưởng thành hành trình.',
  heroImage: ninhBinhImage,
  sampleItineraryImage: hoChiMinhCityImage,
  logoMark,
  logoLockup,
} as const

export const navItems = [
  { label: 'Câu chuyện', href: '#cau-chuyen' },
  { label: 'Cách hoạt động', href: '#cach-hoat-dong' },
  { label: 'Hành trình mẫu', href: '#hanh-trinh' },
  { label: 'Khám phá', href: '#kham-pha' },
] as const

export const sampleItinerary = [
  {
    time: '08:00',
    endTime: '09:20',
    place: 'Bảo tàng Chứng tích Chiến tranh',
    area: 'Quận 3',
    category: 'Lịch sử',
    duration: '1 giờ 20 phút',
    cost: '40.000đ',
    description: 'Bắt đầu sớm để tham quan không gian trưng bày khi lượng khách còn thấp.',
    travelToNext: {
      mode: 'Đi bộ',
      distance: '750 m',
      duration: '10 phút',
      note: 'Đi thẳng theo Võ Văn Tần, không cần gọi xe.',
    },
  },
  {
    time: '09:30',
    endTime: '10:45',
    place: 'Dinh Độc Lập',
    area: 'Quận 1',
    category: 'Kiến trúc · Lịch sử',
    duration: '1 giờ 15 phút',
    cost: '65.000đ',
    description: 'Khung giờ vừa đủ cho tuyến tham quan chính và khuôn viên bên ngoài.',
    travelToNext: {
      mode: 'Đi bộ',
      distance: '1,1 km',
      duration: '16 phút',
      note: 'Tuyến đi xuôi về phía nam, tránh quay lại đường cũ.',
    },
  },
  {
    time: '11:05',
    endTime: '12:30',
    place: 'Chợ Bến Thành',
    area: 'Quận 1',
    category: 'Ẩm thực · Mua sắm',
    duration: '1 giờ 25 phút',
    cost: '~150.000đ',
    description: 'Dành thời gian ăn trưa và khám phá các gian hàng đặc trưng trong chợ.',
    travelToNext: {
      mode: 'Đi bộ',
      distance: '650 m',
      duration: '9 phút',
      note: 'Quãng ngắn trong khu trung tâm, nhanh hơn di chuyển bằng ô tô.',
    },
  },
  {
    time: '12:45',
    endTime: '14:05',
    place: 'Bảo tàng Mỹ thuật TP.HCM',
    area: 'Quận 1',
    category: 'Nghệ thuật · Kiến trúc',
    duration: '1 giờ 20 phút',
    cost: '30.000đ',
    description: 'Ưu tiên hoạt động trong nhà vào đầu giờ chiều, khi nhiệt độ ngoài trời cao.',
    travelToNext: {
      mode: 'Taxi',
      distance: '1,8 km',
      duration: '10 phút',
      note: 'Có 50 phút nghỉ cà phê trước khi tiếp tục chặng cuối.',
    },
  },
  {
    time: '15:15',
    endTime: '17:30',
    place: 'Nguyễn Huệ · Bến Bạch Đằng',
    area: 'Quận 1',
    category: 'Dạo phố · Sông nước',
    duration: '2 giờ 15 phút',
    cost: '~120.000đ',
    description: 'Kết thúc tại bờ sông vào giờ dịu nắng, thuận tiện ngắm thành phố lên đèn.',
    travelToNext: null,
  },
] as const

export const destinations = [
  {
    name: 'Hà Giang',
    region: 'Miền đá nở hoa',
    image: haGiangImage,
    alt: 'Ruộng bậc thang xanh giữa núi đồi Hà Giang',
    className: 'md:col-span-7 md:row-span-2',
  },
  {
    name: 'Hội An',
    region: 'Miền phố cổ',
    image: hoiAnImage,
    alt: 'Những ngôi nhà vàng và đèn lồng tại phố cổ Hội An',
    className: 'md:col-span-5',
  },
  {
    name: 'Hạ Long',
    region: 'Miền kỳ quan',
    image: haLongImage,
    alt: 'Vịnh Hạ Long nhìn từ trên cao với núi đá vôi và thuyền',
    className: 'md:col-span-5',
  },
  {
    name: 'Phú Quốc',
    region: 'Miền nắng biển',
    image: phuQuocImage,
    alt: 'Bãi biển Phú Quốc với hàng dừa bên bờ cát',
    className: 'md:col-span-12',
  },
] as const

export const imageCredits = [
  {
    place: 'Tràng An, Ninh Bình',
    author: 'Jakub Hałun',
    license: 'CC BY 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1456_5313.jpg',
  },
  {
    place: 'Hạ Thành, Hà Giang',
    author: 'Benjamin Smith',
    license: 'CC BY-SA 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_1.jpg',
  },
  {
    place: 'Phố cổ Hội An',
    author: 'Steffen Schmitz (Carschten)',
    license: 'CC BY-SA 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-06.jpg',
  },
  {
    place: 'Vịnh Hạ Long',
    author: 'Vyacheslav Argenberg',
    license: 'CC BY 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Ha_Long_Bay,_Vietnam,_View_from_above.jpg',
  },
  {
    place: 'Bãi biển Phú Quốc',
    author: 'dronepicr',
    license: 'CC BY 2.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Beautiful_beach_on_Phu_Quoc_island_Vietnam_(39543775721).jpg',
  },
  {
    place: 'Sông Sài Gòn, TP.HCM',
    author: 'Diego Delso',
    license: 'CC BY-SA 3.0',
    source:
      'https://commons.wikimedia.org/wiki/File:R%C3%ADo_Saig%C3%B3n,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_29.JPG',
  },
] as const
