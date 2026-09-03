import {
  ArrowDownRight,
  ArrowRight,
  Banknote,
  BellRing,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  CloudRain,
  Compass,
  Footprints,
  Heart,
  Map,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  SunMedium,
  TrainFront,
  Umbrella,
  WalletCards,
} from 'lucide-react'
import { Header } from './components/Header'
import {
  destinations,
  imageCredits,
  navItems,
  sampleItinerary,
  siteConfig,
} from './content/site'

const planningPillars = [
  {
    icon: Heart,
    label: 'Hiểu gu riêng',
    title: 'Một hành trình thật sự là của bạn',
    description:
      'Không chỉ chọn điểm đến, hệ thống hiểu cách bạn muốn trải nghiệm: thong thả, khám phá hay cân bằng.',
  },
  {
    icon: CalendarDays,
    label: 'Xếp lịch thực tế',
    title: 'Đủ đầy nhưng không quá tải',
    description:
      'Giờ mở cửa, thời gian di chuyển, ngân sách và nhịp độ đều được cân nhắc trong từng ngày.',
  },
  {
    icon: CloudRain,
    label: 'Luôn thích ứng',
    title: 'Kế hoạch đổi theo thực tế',
    description:
      'Thời tiết xấu hay một điểm đến đóng cửa? Phần bị ảnh hưởng sẽ được xem lại, phần phù hợp được giữ nguyên.',
  },
] as const

const steps = [
  {
    number: '01',
    icon: Compass,
    title: 'Kể về chuyến đi',
    description:
      'Chọn nơi muốn đến, quỹ thời gian, ngân sách và những trải nghiệm khiến bạn hứng thú.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Kết nối hành trình',
    description:
      'Các điểm đến được kết hợp thành lịch trình từng ngày với lộ trình và nhịp đi hợp lý.',
  },
  {
    number: '03',
    icon: Route,
    title: 'Khởi hành và kịp thời thích nghi.',
    description:
      'Gửi phản hồi bất cứ lúc nào để điều chỉnh một phần kế hoạch mà không phải bắt đầu lại từ đầu.',
  },
] as const

const adaptiveFeatures = [
  {
    icon: Umbrella,
    title: 'Thời tiết',
    description: 'Đảo thứ tự hoạt động hoặc đề xuất phương án trong nhà khi trời mưa.',
  },
  {
    icon: Clock3,
    title: 'Giờ hoạt động',
    description: 'Tránh lịch trình không khả thi vì điểm đến đóng cửa hoặc quá sát giờ.',
  },
  {
    icon: TrainFront,
    title: 'Di chuyển',
    description: 'Tính khoảng đệm và điều chỉnh khi giao thông làm thay đổi thời gian đến.',
  },
  {
    icon: WalletCards,
    title: 'Ngân sách',
    description: 'Theo dõi ước tính chi phí để hành trình luôn nằm trong giới hạn đã chọn.',
  },
] as const

function App() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen overflow-hidden bg-paper text-ink">
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng
      </a>
      <Header />

      <main id="main-content" className="pt-18">
        <section
          id="top"
          className="relative scroll-mt-24 overflow-hidden pb-20 pt-12 lg:pb-30 lg:pt-20"
        >
          <div
            className="topographic absolute inset-y-0 right-0 hidden w-1/2 opacity-35 lg:block"
            aria-hidden="true"
          />
          <div className="container-shell relative grid items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10">
            <div className="relative z-10 lg:pb-8">
              <p className="hero-reveal mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest/70">
                <span className="h-px w-9 bg-terracotta" />
                AI Travel Planner
              </p>
              <h1 className="hero-reveal hero-reveal-delay-1 max-w-3xl font-display text-[clamp(3.25rem,7vw,6.6rem)] font-medium leading-[0.95] tracking-[-0.06em] text-ink">
                Đi Việt Nam,
                <span className="mt-2 block italic text-terracotta">
                  theo cách của riêng bạn.
                </span>
              </h1>
              <p className="hero-reveal hero-reveal-delay-2 mt-8 max-w-xl text-base leading-7 text-ink/67 sm:text-lg sm:leading-8">
                {siteConfig.name} biến sở thích, ngân sách và quỹ thời gian thành một hành trình, rồi linh hoạt thích ứng khi chuyến đi thay đổi.
              </p>
              <div className="hero-reveal hero-reveal-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#hanh-trinh" className="button-primary justify-center">
                  Xem hành trình mẫu
                  <ArrowDownRight aria-hidden="true" size={18} />
                </a>
                <a href="#cach-hoat-dong" className="button-secondary justify-center">
                  {siteConfig.name} hoạt động thế nào?
                </a>
              </div>
              <div className="hero-reveal hero-reveal-delay-3 mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-forest/15 pt-5 text-xs font-medium text-ink/60">
                <span className="flex items-center gap-2">
                  <Check size={14} className="text-terracotta" />Cá nhân hóa theo gu
                </span>
                <span className="flex items-center gap-2">
                  <Check size={14} className="text-terracotta" />Cân đối thời gian
                </span>
                <span className="flex items-center gap-2">
                  <Check size={14} className="text-terracotta" />Linh hoạt thay đổi
                </span>
              </div>
            </div>

            <div className="hero-reveal hero-reveal-delay-2 relative mx-auto w-full max-w-2xl px-4 pb-14 sm:px-10 lg:mx-0 lg:max-w-none lg:pl-16 lg:pr-0">
              <div className="hero-arch relative ml-auto aspect-[4/5] w-full max-w-[35rem] overflow-hidden bg-forest">
                <img
                  src={siteConfig.heroImage}
                  alt="Du khách chèo thuyền giữa núi đá vôi và sông nước Tràng An, Ninh Bình"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
                  width="1280"
                  height="854"
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                <div className="absolute bottom-7 left-7 text-paper">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
                    20.2506° N, 105.9745° E
                  </p>
                  <p className="mt-2 font-display text-3xl">Tràng An, Ninh Bình</p>
                </div>
              </div>

              {/* <div className="absolute -bottom-1 left-0 w-[min(82%,20rem)] border border-forest/10 bg-cream p-5 shadow-[0_22px_55px_rgba(23,63,53,0.16)] sm:left-2 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-terracotta">
                      Lịch trình dành cho bạn
                    </p>
                    <p className="mt-1 font-display text-xl font-medium">Ninh Bình · 3 ngày</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sun/20 text-forest">
                    <Sparkles aria-hidden="true" size={18} />
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3 text-xs text-ink/60">
                  <span className="grid size-7 place-items-center rounded-full bg-forest text-paper">1</span>
                  <span className="h-px flex-1 border-t border-dashed border-forest/30" />
                  <span className="grid size-7 place-items-center rounded-full border border-forest/20 bg-paper">2</span>
                  <span className="h-px flex-1 border-t border-dashed border-forest/30" />
                  <span className="grid size-7 place-items-center rounded-full border border-forest/20 bg-paper">3</span>
                </div>
              </div> */}

              <div className="absolute right-0 top-[18%] hidden border border-paper/40 bg-forest/92 px-4 py-3 text-paper shadow-xl backdrop-blur sm:block">
                <p className="flex items-center gap-2 text-xs font-medium">
                  <SunMedium size={15} className="text-sun" />Sáng mai · 26°C
                </p>
                <p className="mt-1 text-[0.65rem] text-paper/60">Đẹp trời để đi thuyền</p>
              </div>

            </div>
          </div>
        </section>

        <div className="bg-forest py-4 text-paper" aria-label="Giá trị nổi bật">
          <div className="container-shell flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] sm:justify-between">
            <span>Cá nhân hóa</span><span className="text-sun"></span>
            <span>Lịch trình thực tế</span><span className="text-sun"></span>
            <span>Thích ứng tức thời</span><span className="text-sun"></span>
            <span>Đi khắp Việt Nam</span>
          </div>
        </div>

        <section id="cau-chuyen" className="section-padding scroll-mt-20 bg-cream">
          <div className="container-shell">
            <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[0.34fr_1fr] lg:gap-16 lg:pb-20">
              <p className="section-kicker">01 · Câu chuyện</p>
              <div>
                <h2 className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]">
                  Một chuyến đi đáng nhớ không nên bắt đầu bằng
                  <span className="italic text-terracotta"> hàng chục tab đang mở.</span>
                </h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
                  Từ nơi ở, điểm tham quan, giờ mở cửa đến quãng đường và chi phí, mỗi lựa chọn
                  đều tác động lên phần còn lại. {siteConfig.name} nối những mảnh ghép rời rạc ấy thành
                  một kế hoạch hoàn chỉnh.
                </p>
              </div>
            </div>

            <div className="grid border-b border-forest/15 md:grid-cols-3">
              {planningPillars.map(({ icon: Icon, label, title, description }, index) => (
                <article
                  key={label}
                  className="group border-forest/15 py-9 md:border-r md:px-8 md:py-12 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center border border-forest/20 text-forest transition-colors group-hover:bg-forest group-hover:text-paper">
                      <Icon aria-hidden="true" size={21} strokeWidth={1.7} />
                    </span>
                    <span className="font-display text-lg italic text-ink/35">0{index + 1}</span>
                  </div>
                  <p className="mt-9 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">
                    {label}
                  </p>
                  <h3 className="mt-3 max-w-xs font-display text-2xl font-medium leading-tight">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="cach-hoat-dong" className="section-padding scroll-mt-20 bg-paper">
          <div className="container-shell">
            <div className="grid gap-8 border-b border-forest/15 pb-14 lg:grid-cols-[1fr_0.34fr] lg:gap-16 lg:pb-20">
              <div>
                <h2 className="max-w-4xl font-display text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[1.03] tracking-[-0.045em]">
                  Từ một ý tưởng đến hành trình sẵn sàng để đi.
                </h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
                  Bạn giữ quyền quyết định. Journie đảm nhiệm phần tổng hợp, sắp xếp và kiểm tra những
                  ràng buộc khiến việc lập kế hoạch trở nên phức tạp.
                </p>
              </div>
              <p className="section-kicker text-right">02 · Cách hoạt động</p>
            </div>

            <div className="mt-14 grid gap-px border border-forest/15 bg-forest/15 lg:mt-20 lg:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, description }, index) => (
                <article
                  key={number}
                  className="group relative bg-paper p-7 sm:p-10 lg:min-h-[25rem]"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-5xl italic text-forest/18">{number}</span>
                    <Icon
                      aria-hidden="true"
                      size={29}
                      strokeWidth={1.45}
                      className="text-terracotta"
                    />
                  </div>
                  <div className="mt-18 lg:mt-28">
                    <h3 className="font-display text-3xl font-medium tracking-[-0.025em]">
                      {title}
                    </h3>
                    <p className="mt-4 max-w-sm text-sm leading-6 text-ink/60">{description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight
                      className="absolute -right-3 top-1/2 z-10 hidden size-6 rounded-full bg-forest p-1 text-paper lg:block"
                      aria-hidden="true"
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="hanh-trinh" className="section-padding scroll-mt-20 bg-forest text-paper">
          <div className="container-shell grid gap-14 lg:grid-cols-[0.68fr_1.32fr] lg:gap-18">
            <div className="lg:sticky lg:top-30 lg:self-start">
              <p className="section-kicker text-sun">03 · Hành trình mẫu</p>
              <h2 className="mt-5 max-w-xl font-display text-[clamp(2.6rem,5vw,5rem)] font-medium leading-[1.02] tracking-[-0.05em]">
                Một ngày Sài Gòn, đi đúng tuyến, không vòng đường.
              </h2>
              <p className="mt-7 max-w-lg text-base leading-7 text-paper/62">
                Lịch trình dành cho người yêu lịch sử, kiến trúc và ẩm thực địa phương. Năm điểm
                được xếp theo một hướng di chuyển xuyên khu trung tâm, có khoảng nghỉ và thời gian
                đệm rõ ràng.
              </p>

              <div className="mt-8 border-l-2 border-sun pl-5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sun">
                  Hồ sơ chuyến đi
                </p>
                <p className="mt-2 text-sm leading-6 text-paper/65">
                  Lịch sử · Kiến trúc · Ẩm thực · Nhịp độ vừa phải
                </p>
              </div>

              <div className="mt-9 grid max-w-lg grid-cols-3 border-y border-paper/15 py-5">
                <div>
                  <p className="font-display text-2xl">1 ngày</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">Thời lượng</p>
                </div>
                <div className="border-x border-paper/15 px-5">
                  <p className="font-display text-2xl">5 điểm</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">Điểm dừng</p>
                </div>
                <div className="pl-5">
                  <p className="font-display text-2xl">4,3 km</p>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-widest text-paper/45">Di chuyển</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-paper/15 bg-cream text-ink shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
              <figure className="relative h-48 overflow-hidden sm:h-60">
                <img
                  src={siteConfig.sampleItineraryImage}
                  alt="Trung tâm Thành phố Hồ Chí Minh nhìn từ sông Sài Gòn"
                  className="h-full w-full object-cover"
                  width="1280"
                  height="558"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />
                <figcaption className="absolute bottom-5 left-6 text-paper sm:bottom-7 sm:left-9">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
                    10.7769° N, 106.7009° E
                  </p>
                  <p className="mt-1 font-display text-2xl sm:text-3xl">Trung tâm TP.HCM</p>
                </figcaption>
              </figure>

              <div className="flex flex-col gap-5 border-b border-forest/15 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-terracotta">
                    Hành trình đã tối ưu · Thứ Bảy
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-medium">Từ Quận 3 ra bờ sông</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                    <Banknote size={14} />~450.000đ
                  </span>
                  <span className="flex items-center gap-1.5 border border-forest/15 bg-paper px-3 py-2">
                    <Navigation size={14} />45 phút
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-9">
                <div className="mb-8 flex items-start gap-3 border-l-3 border-sun bg-sun/18 p-4">
                  <Navigation
                    aria-hidden="true"
                    size={20}
                    className="mt-0.5 shrink-0 text-terracotta"
                  />
                  <div>
                    <p className="text-sm font-semibold">Đã tối ưu theo tình hình giao thông</p>
                    <p className="mt-1 text-xs leading-5 text-ink/60">
                      Ưu tiên đi bộ ở ba chặng ngắn trong trung tâm, giảm thời gian chờ xe và tránh
                      quay lại tuyến cũ.
                    </p>
                  </div>
                </div>

                <ol aria-label="Lịch trình chi tiết một ngày tại Thành phố Hồ Chí Minh">
                  {sampleItinerary.map((item, index) => (
                    <li key={item.place} className="border-t border-forest/15 py-7 first:border-t-0 first:pt-0">
                      <article className="grid gap-5 sm:grid-cols-[5.5rem_1fr] sm:gap-7">
                        <div className="flex items-center gap-3 sm:block">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest text-[0.65rem] font-semibold text-paper">
                            {index + 1}
                          </span>
                          <p className="font-display text-2xl font-medium text-forest sm:mt-3">
                            {item.time}
                          </p>
                          <p className="text-[0.65rem] text-ink/40">đến {item.endTime}</p>
                        </div>

                        <div>
                          <p className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
                            <MapPin size={13} />{item.area}
                            <span className="text-forest/25">·</span>
                            <span className="text-forest/55">{item.category}</span>
                          </p>
                          <h4 className="mt-2 font-display text-xl font-medium sm:text-2xl">{item.place}</h4>
                          <p className="mt-2 text-xs leading-5 text-ink/55 sm:text-sm">{item.description}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-medium text-ink/45">
                            <span className="flex items-center gap-1.5"><Clock3 size={13} />{item.duration}</span>
                            <span className="flex items-center gap-1.5"><Banknote size={13} />{item.cost}</span>
                          </div>
                        </div>
                      </article>

                      {item.travelToNext && (
                        <div className="mt-5 grid gap-3 border-l-2 border-dashed border-forest/25 bg-paper/70 px-4 py-3 sm:ml-[6.35rem] sm:grid-cols-[auto_1fr] sm:items-center">
                          <span className="flex items-center gap-2 text-xs font-semibold text-forest">
                            {item.travelToNext.mode === 'Đi bộ' ? (
                              <Footprints aria-hidden="true" size={15} />
                            ) : (
                              <CarFront aria-hidden="true" size={15} />
                            )}
                            {item.travelToNext.mode} · {item.travelToNext.distance} · {item.travelToNext.duration}
                          </span>
                          {/* <span className="text-[0.68rem] leading-5 text-ink/45 sm:text-right">
                            {item.travelToNext.note}
                          </span> */}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding bg-cream">
          <div className="container-shell">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="section-kicker">04 · Luôn thích ứng</p>
                <h2 className="section-title mt-5">
                  Kế hoạch không đứng yên khi thực tế thay đổi.
                </h2>
              </div>
              <p className="max-w-lg text-base leading-7 text-ink/65 lg:ml-auto">
                {siteConfig.name} chỉ tạo lại phần bị ảnh hưởng, giữ nguyên những sắp xếp bạn đã
                hài lòng và giải thích rõ điều gì vừa thay đổi.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:mt-20 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="route-canvas relative min-h-[31rem] overflow-hidden bg-forest p-7 text-paper sm:p-10">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-sun">
                      Bản đồ hành trình
                    </p>
                    <h3 className="mt-2 font-display text-3xl">Một tuyến đi, nhiều phương án.</h3>
                  </div>
                  <Map aria-hidden="true" size={28} strokeWidth={1.5} className="text-paper/60" />
                </div>
                <svg
                  className="absolute inset-x-[8%] top-[26%] h-[58%] w-[84%]"
                  viewBox="0 0 600 340"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M34 272C88 230 126 240 174 202C222 164 259 188 310 146C361 104 400 130 445 92C490 54 526 73 566 42" stroke="#F4B942" strokeWidth="3" strokeDasharray="7 10" />
                  <circle cx="34" cy="272" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="174" cy="202" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="310" cy="146" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="445" cy="92" r="9" fill="#E16F4A" stroke="#F7F2E8" strokeWidth="4" />
                  <circle cx="566" cy="42" r="9" fill="#F4B942" stroke="#F7F2E8" strokeWidth="4" />
                </svg>
                <span className="absolute bottom-[13%] left-[7%] max-w-24 text-xs font-medium">Chứng tích Chiến tranh</span>
                <span className="absolute bottom-[31%] left-[25%] max-w-20 text-xs font-medium">Dinh Độc Lập</span>
                <span className="absolute left-[47%] top-[46%] max-w-20 text-xs font-medium">Chợ Bến Thành</span>
                <span className="absolute right-[19%] top-[31%] max-w-24 text-xs font-medium">Bảo tàng Mỹ thuật</span>
                <span className="absolute right-[3%] top-[18%] max-w-20 text-xs font-medium">Bến Bạch Đằng</span>
                <div className="absolute bottom-7 right-7 max-w-[17rem] border border-paper/15 bg-paper p-4 text-ink shadow-xl sm:bottom-10 sm:right-10">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <BellRing size={15} className="text-terracotta" />Đã tránh một đoạn ùn tắc
                  </p>
                  <p className="mt-1.5 text-[0.68rem] leading-5 text-ink/55">
                    Ưu tiên đi bộ từ Chợ Bến Thành đến Bảo tàng Mỹ thuật, tiết kiệm 11 phút.
                  </p>
                </div>
              </div>

              <div className="border border-forest/15 bg-paper">
                {adaptiveFeatures.map(({ icon: Icon, title, description }, index) => (
                  <article
                    key={title}
                    className="group grid grid-cols-[auto_1fr] gap-5 border-b border-forest/15 p-6 last:border-b-0 sm:p-8"
                  >
                    <span className="grid size-11 place-items-center border border-forest/15 text-forest transition-colors group-hover:bg-terracotta group-hover:text-paper">
                      <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
                    </span>
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-display text-xl font-medium">{title}</h3>
                        <span className="text-xs text-ink/25">0{index + 1}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink/58">{description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="kham-pha" className="section-padding scroll-mt-20 bg-paper">
          <div className="container-shell">
            <div className="flex flex-col gap-7 border-b border-forest/15 pb-10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">05 · Dọc miền đất nước</p>
                <h2 className="section-title mt-5 max-w-3xl">
                  Mỗi miền một nhịp, mỗi người một cách đi.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-ink/60">
                Từ những cung đèo phương Bắc đến miền biển phía Nam, hành trình bắt đầu từ nơi bạn muốn đến.
              </p>
            </div>

            <div className="mt-10 grid auto-rows-[17rem] grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[15rem]">
              {destinations.map((destination) => (
                <figure
                  key={destination.name}
                  className={`destination-card group relative overflow-hidden bg-forest ${destination.className}`}
                >
                  <img
                    src={destination.image}
                    alt={destination.alt}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105 group-hover:brightness-90"
                    width="1280"
                    height="854"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/5 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-paper sm:p-8">
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
                        {destination.region}
                      </p>
                      <h3 className="mt-1 font-display text-3xl font-medium sm:text-4xl">
                        {destination.name}
                      </h3>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-paper/40 bg-paper/10 backdrop-blur transition-transform group-hover:-rotate-12">
                      <ArrowDownRight aria-hidden="true" size={18} />
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-terracotta py-18 text-paper sm:py-24">
          <div className="container-shell grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/65">
                Chuyến đi tiếp theo
              </p>
              <h2 className="mt-5 max-w-4xl font-display text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.96] tracking-[-0.055em]">
                Ít thời gian lập kế hoạch. Nhiều thời gian để trải nghiệm.
              </h2>
            </div>
            <div className="lg:pb-2">
              <p className="max-w-md text-base leading-7 text-paper/72">
                {siteConfig.name} đang được xây dựng để mỗi hành trình tại Việt Nam vừa thực tế,
                vừa mang đậm dấu ấn riêng của bạn.
              </p>
              <a
                href="#top"
                className="mt-7 inline-flex items-center gap-2 border-b border-paper pb-1 text-sm font-semibold"
              >
                Trở lại đầu hành trình <ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink py-12 text-paper">
        <div className="container-shell">
          <div className="grid gap-10 border-b border-paper/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="max-w-md">
              <div className="inline-flex bg-paper p-3">
                <img
                  src={siteConfig.logoLockup}
                  alt={siteConfig.name}
                  className="h-28 w-auto"
                  width="640"
                  height="600"
                  loading="lazy"
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-paper/52">{siteConfig.description}</p>
              <p className="mt-2 text-xs leading-5 text-paper/38">{siteConfig.brandStory}</p>
            </div>
            <nav
              className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-paper/65"
              aria-label="Điều hướng cuối trang"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-sun"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <details className="border-b border-paper/12 py-6 text-xs text-paper/48">
            <summary className="cursor-pointer font-medium text-paper/65">
              Nguồn ảnh và giấy phép
            </summary>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imageCredits.map((credit) => (
                <p key={credit.place} className="leading-5">
                  <a
                    href={credit.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-paper/75 underline decoration-paper/25 underline-offset-3 hover:text-sun"
                  >
                    {credit.place}
                  </a>
                  <br />{credit.author} · {credit.license}
                </p>
              ))}
            </div>
          </details>

          <div className="flex flex-col gap-3 pt-7 text-[0.68rem] text-paper/40 sm:flex-row sm:items-center sm:justify-between">
            <p>© {currentYear} {siteConfig.name}. Sản phẩm đang trong giai đoạn phát triển.</p>
            <p>Thiết kế cho những hành trình trên dải đất hình chữ S.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
