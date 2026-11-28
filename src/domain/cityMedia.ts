import daNangCauVang from '../assets/images/cities/da-nang/cau-vang.jpg'
import daNangChuaLinhUng from '../assets/images/cities/da-nang/chua-linh-ung.jpg'
import daNangDeoHaiVan from '../assets/images/cities/da-nang/deo-hai-van.jpg'
import daNangDrawing from '../assets/images/drawings/da-nang.svg'
import daNangDrawingNight from '../assets/images/drawings/da-nang-night.svg'
import daNangImage from '../assets/images/da-nang.jpg'
import daNangMyKhe from '../assets/images/cities/da-nang/my-khe.jpg'
import daNangNguHanhSon from '../assets/images/cities/da-nang/ngu-hanh-son.jpg'
import haNoiCauLongBien from '../assets/images/cities/ha-noi/cau-long-bien.jpg'
import haNoiChuaMotCot from '../assets/images/cities/ha-noi/chua-mot-cot.jpg'
import haNoiDrawing from '../assets/images/drawings/ha-noi.svg'
import haNoiDrawingNight from '../assets/images/drawings/ha-noi-night.svg'
import haNoiHoangThanh from '../assets/images/cities/ha-noi/hoang-thanh.jpg'
import haNoiImage from '../assets/images/ha-noi.jpg'
import haNoiNhaHatLon from '../assets/images/cities/ha-noi/nha-hat-lon.jpg'
import haNoiVanMieu from '../assets/images/cities/ha-noi/van-mieu.jpg'
import hueCauTruongTien from '../assets/images/cities/hue/cau-truong-tien.jpg'
import hueChuaThienMu from '../assets/images/cities/hue/chua-thien-mu.jpg'
import hueDrawing from '../assets/images/drawings/hue.svg'
import hueDrawingNight from '../assets/images/drawings/hue-night.svg'
import hueHienLamCac from '../assets/images/cities/hue/hien-lam-cac.jpg'
import hueImage from '../assets/images/hue.jpg'
import hueLangKhaiDinh from '../assets/images/cities/hue/lang-khai-dinh.jpg'
import hueLangMinhMang from '../assets/images/cities/hue/lang-minh-mang.jpg'
import saiGonBuuDien from '../assets/images/cities/sai-gon/buu-dien.jpg'
import saiGonChoBenThanh from '../assets/images/cities/sai-gon/cho-ben-thanh.jpg'
import saiGonDrawing from '../assets/images/drawings/sai-gon.svg'
import saiGonDrawingNight from '../assets/images/drawings/sai-gon-night.svg'
import saiGonImage from '../assets/images/ho-chi-minh-city.jpg'
import saiGonNhaHatThanhPho from '../assets/images/cities/sai-gon/nha-hat-thanh-pho.jpg'
import saiGonNhaThoDucBa from '../assets/images/cities/sai-gon/nha-tho-duc-ba.jpg'
import saiGonUbndThanhPho from '../assets/images/cities/sai-gon/ubnd-thanh-pho.jpg'
import type { CityId } from './types'

/** An openly licensed Wikimedia Commons photograph of a city landmark, credited in the landing footer. */
export type CityPhoto = { src: string; name: [vi: string, en: string]; author: string; license: string; source: string }

/** Real photos per city: the first is the city's cover, and the whole set shuffles on the planning wait screen. */
export const cityGallery: Record<CityId, CityPhoto[]> = {
  'sai-gon': [
    { src: saiGonImage, name: ['Landmark 81 và sông Sài Gòn', 'Landmark 81 and the Saigon River'], author: 'Radek Kucharski', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Saigon_at_Blue_Hour.jpg' },
    { src: saiGonBuuDien, name: ['Bưu điện Trung tâm Sài Gòn', 'Saigon Central Post Office'], author: 'Yesvn123', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Saigon_Central_Post_Office_2022.jpg' },
    { src: saiGonNhaThoDucBa, name: ['Nhà thờ Đức Bà Sài Gòn', 'Notre-Dame Cathedral, Saigon'], author: 'hiyang.on.flickr', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Saigon_Notre-Dame_Basilica_(29605571325).jpg' },
    { src: saiGonUbndThanhPho, name: ['Trụ sở UBND Thành phố', 'Ho Chi Minh City Hall'], author: 'Steffen Schmitz (Carschten)', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City,_City_Hall,_2020-01_CN-01.jpg' },
    { src: saiGonChoBenThanh, name: ['Chợ Bến Thành', 'Ben Thanh Market'], author: 'Bahnfrend', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ben_Thanh_Market,_2023_(01).jpg' },
    { src: saiGonNhaHatThanhPho, name: ['Nhà hát Thành phố', 'Saigon Opera House'], author: 'Diego Delso', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:%C3%93pera,_Ciudad_Ho_Chi_Minh,_Vietnam,_2013-08-14,_DD_02.JPG' },
  ],
  'ha-noi': [
    { src: haNoiImage, name: ['Tháp Rùa, Hồ Gươm', 'Turtle Tower, Hoan Kiem Lake'], author: 'P. Hughes', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Hanoi_-_Turtle_Tower_(Th%C3%A1p_R%C3%B9a),_Ho%C3%A0n_Ki%E1%BA%BFm_Lake.jpg' },
    { src: haNoiChuaMotCot, name: ['Chùa Một Cột', 'One Pillar Pagoda'], author: 'Daderot', license: 'CC0', source: 'https://commons.wikimedia.org/wiki/File:One_Pillar_Pagoda_-_Hanoi,_Vietnam_-_DSC03500.JPG' },
    { src: haNoiVanMieu, name: ['Văn Miếu – Quốc Tử Giám', 'Temple of Literature'], author: 'Jakub Hałun', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Dai_Trung_gate,_Temple_of_Literature,_Hanoi,_Vietnam,_20240123_0928_3065.jpg' },
    { src: haNoiCauLongBien, name: ['Cầu Long Biên', 'Long Bien Bridge'], author: 'Rod Waddington', license: 'CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Long_Bien_Bridge_(31058890737).jpg' },
    { src: haNoiNhaHatLon, name: ['Nhà hát Lớn Hà Nội', 'Hanoi Opera House'], author: 'P. Hughes', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Hanoi_-_Opera_House_01.jpg' },
    { src: haNoiHoangThanh, name: ['Hoàng thành Thăng Long', 'Imperial Citadel of Thang Long'], author: 'katiebordner', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Central_Sector_of_the_Imperial_Citadel_of_Thang_Long_-_Hanoi_(26246667851).jpg' },
  ],
  'da-nang': [
    { src: daNangImage, name: ['Cầu Rồng', 'Dragon Bridge'], author: 'Supanut Arunoprayote', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Da_Nang_Dragon_Bridge_(II).jpg' },
    { src: daNangCauVang, name: ['Cầu Vàng, Bà Nà Hills', 'Golden Bridge, Ba Na Hills'], author: 'Ray in Manila', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:The_Golden_Bridge,_Ba_Na_Hills,_Vietnam.jpg' },
    { src: daNangChuaLinhUng, name: ['Chùa Linh Ứng, Sơn Trà', 'Linh Ung Pagoda, Son Tra'], author: 'Christophe95', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Linh_Ung_Pagoda_6.jpg' },
    { src: daNangDeoHaiVan, name: ['Đèo Hải Vân', 'Hai Van Pass'], author: 'Steffen Schmitz (Carschten)', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:L%C4%83ng_C%C3%B4,_H%E1%BA%A3i_V%C3%A2n_Pass,_2020-01_CN-02.jpg' },
    { src: daNangMyKhe, name: ['Bãi biển Mỹ Khê', 'My Khe Beach'], author: 'Christophe95', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:My_Khe_Beach_14.jpg' },
    { src: daNangNguHanhSon, name: ['Ngũ Hành Sơn', 'Marble Mountains'], author: 'Chainwit', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Buddhist_temple_complex_on_the_Thuy_Son,_Da_Nang_Marble_Mountains_(2024)_-_img_01.jpg' },
  ],
  hue: [
    { src: hueImage, name: ['Ngọ Môn, Đại Nội', 'Meridian Gate, Imperial City'], author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Citadel-of-Hu%E1%BA%BF-01.jpg' },
    { src: hueChuaThienMu, name: ['Chùa Thiên Mụ', 'Thien Mu Pagoda'], author: 'Dominik Tefert', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Hue_Thien_Mu-Pagoda.JPG' },
    { src: hueHienLamCac, name: ['Hiển Lâm Các, Đại Nội', 'Hien Lam Pavilion, Imperial City'], author: 'Supanut Arunoprayote', license: 'CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Pavilion_of_Splendour.jpg' },
    { src: hueCauTruongTien, name: ['Cầu Trường Tiền về đêm', 'Truong Tien Bridge at night'], author: 'Lưu Ly', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Cau_Trang_tien_ve_dem.jpg' },
    { src: hueLangKhaiDinh, name: ['Lăng Khải Định', 'Tomb of Khai Dinh'], author: 'dronepicr', license: 'CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Khai_Dinh_Mausoleum_Hue_(27767160179).jpg' },
    { src: hueLangMinhMang, name: ['Lăng Minh Mạng', 'Tomb of Minh Mang'], author: 'CEphoto, Uwe Aranas', license: 'CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Hue_Vietnam_Tomb-of-Emperor-Minh-Mang-01.jpg' },
  ],
}

export const cityImage: Partial<Record<CityId, string>> = Object.fromEntries(Object.entries(cityGallery).map(([city, photos]) => [city, photos[0].src]))

/** Each city's landmark redrawn from its poster, sunk at the foot of the app's pages; the night set is lighter. */
export const cityDrawing: Record<CityId, { day: string; night: string }> = {
  'sai-gon': { day: saiGonDrawing, night: saiGonDrawingNight },
  'ha-noi': { day: haNoiDrawing, night: haNoiDrawingNight },
  'da-nang': { day: daNangDrawing, night: daNangDrawingNight },
  hue: { day: hueDrawing, night: hueDrawingNight },
}
