import haGiangImage from '../assets/images/ha-giang.jpg'
import haLongImage from '../assets/images/ha-long.jpg'
import hoChiMinhCityImage from '../assets/images/ho-chi-minh-city.jpg'
import hoiAnImage from '../assets/images/hoi-an.jpg'
import logoMark from '../assets/images/journie-mark.png'
import logoMarkLight from '../assets/images/journie-mark-light.png'
import ninhBinhImage from '../assets/images/ninh-binh.jpg'
import phuQuocImage from '../assets/images/phu-quoc.jpg'

export const siteConfig = {
  name: 'Journie',
  sampleItineraryImage: hoChiMinhCityImage,
  logoMark,
  logoMarkLight,
} as const

export const sampleItinerary = [
  {
    time: '08:00',
    endTime: '09:20',
    durationMinutes: 80,
    costVnd: 40000,
    travelToNext: {
      mode: 'walk',
      distanceKm: 0.75,
      durationMinutes: 10,
    },
  },
  {
    time: '09:30',
    endTime: '10:45',
    durationMinutes: 75,
    costVnd: 65000,
    travelToNext: {
      mode: 'walk',
      distanceKm: 1.1,
      durationMinutes: 16,
    },
  },
  {
    time: '11:05',
    endTime: '12:30',
    durationMinutes: 85,
    costVnd: 150000,
    travelToNext: {
      mode: 'walk',
      distanceKm: 0.65,
      durationMinutes: 9,
    },
  },
  {
    time: '12:45',
    endTime: '14:05',
    durationMinutes: 80,
    costVnd: 30000,
    travelToNext: {
      mode: 'taxi',
      distanceKm: 1.8,
      durationMinutes: 10,
    },
  },
  {
    time: '15:15',
    endTime: '17:30',
    durationMinutes: 135,
    costVnd: 120000,
    travelToNext: null,
  },
] as const

export const destinations = [
  {
    id: 'ha-giang',
    image: haGiangImage,
    atmosphere: 'highland',
    coordinates: [22.8233, 104.9836],
    tint: '#0f3128',
  },
  {
    id: 'ha-long',
    image: haLongImage,
    atmosphere: 'bay',
    coordinates: [20.9101, 107.1839],
    tint: '#0c3440',
  },
  {
    id: 'ninh-binh',
    image: ninhBinhImage,
    atmosphere: 'karst',
    coordinates: [20.2506, 105.9745],
    tint: '#173f35',
  },
  {
    id: 'hoi-an',
    image: hoiAnImage,
    atmosphere: 'lanterns',
    coordinates: [15.8801, 108.338],
    tint: '#3a2310',
  },
  {
    id: 'sai-gon',
    image: hoChiMinhCityImage,
    atmosphere: 'city',
    coordinates: [10.7769, 106.7009],
    tint: '#14202b',
  },
  {
    id: 'phu-quoc',
    image: phuQuocImage,
    atmosphere: 'sunset',
    coordinates: [10.2899, 103.984],
    tint: '#103a43',
  },
] as const

export type Atmosphere = (typeof destinations)[number]['atmosphere']

/** One chapter per landing-page section; scrolling reads as travelling between places. */
export const journeyChapters = [
  { id: 'top', coordinates: [20.2506, 105.9745], tone: 'light' },
  { id: 'cau-chuyen', coordinates: [22.8233, 104.9836], tone: 'light' },
  { id: 'cach-hoat-dong', coordinates: [15.8801, 108.338], tone: 'light' },
  { id: 'hanh-trinh', coordinates: [10.7769, 106.7009], tone: 'dark' },
  { id: 'thich-ung', coordinates: [20.9101, 107.1839], tone: 'light' },
  { id: 'kham-pha', coordinates: [16.0471, 108.2068], tone: 'dark' },
  { id: 'khoi-hanh', coordinates: [10.2899, 103.984], tone: 'dark' },
] as const

/** Credits for the destination photos above; the city photos are credited from `cityGallery` (domain/cityMedia). */
export const imageCredits = [
  {
    author: 'Jakub Hałun',
    license: 'CC BY 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1456_5313.jpg',
  },
  {
    author: 'Benjamin Smith',
    license: 'CC BY-SA 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Th%C3%A0nh,_H%C3%A0_Giang,_Vietnam_-_1.jpg',
  },
  {
    author: 'Steffen Schmitz (Carschten)',
    license: 'CC BY-SA 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-06.jpg',
  },
  {
    author: 'Steffen Schmitz (Carschten)',
    license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:H%E1%BA%A1_Long_Bay,_Ti_T%E1%BB%91p_Island,_2020-01_CN-01.jpg',
  },
  {
    author: 'FrogsLegs71',
    license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Phu_Quoc_Beach.jpg',
  },
] as const
