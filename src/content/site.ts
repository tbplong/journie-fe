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
  heroImage: ninhBinhImage,
  sampleItineraryImage: hoChiMinhCityImage,
  logoMark,
  logoLockup,
} as const

export const sampleItinerary = [
  {
    id: 'war-remnants-museum',
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
    id: 'independence-palace',
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
    id: 'ben-thanh-market',
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
    id: 'fine-arts-museum',
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
    id: 'nguyen-hue-bach-dang',
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
    className: 'md:col-span-7 md:row-span-2',
  },
  {
    id: 'hoi-an',
    image: hoiAnImage,
    className: 'md:col-span-5',
  },
  {
    id: 'ha-long',
    image: haLongImage,
    className: 'md:col-span-5',
  },
  {
    id: 'phu-quoc',
    image: phuQuocImage,
    className: 'md:col-span-12',
  },
] as const

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
    author: 'Vyacheslav Argenberg',
    license: 'CC BY 4.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Ha_Long_Bay,_Vietnam,_View_from_above.jpg',
  },
  {
    author: 'dronepicr',
    license: 'CC BY 2.0',
    source:
      'https://commons.wikimedia.org/wiki/File:Beautiful_beach_on_Phu_Quoc_island_Vietnam_(39543775721).jpg',
  },
  {
    author: 'Diego Delso',
    license: 'CC BY-SA 3.0',
    source:
      'https://commons.wikimedia.org/wiki/File:R%C3%ADo_Saig%C3%B3n,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_29.JPG',
  },
] as const
