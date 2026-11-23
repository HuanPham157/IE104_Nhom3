import Link from 'next/link';
import { BrandLogo, Icon, type IconName } from '@/components/ui/Brand';

const waveform = [18, 34, 52, 28, 64, 42, 78, 56, 34, 70, 46, 88, 60, 38, 68, 50, 32, 58, 44, 26, 54, 72, 40, 30, 48, 24, 36, 62, 44, 20];

const steps = [
  { step: '01', title: 'Mở lớp & ra đề', text: 'Giảng viên tạo lớp, soạn câu hỏi vấn đáp kèm barem, đáp án tham khảo và hạn nộp.' },
  { step: '02', title: 'Sinh viên trả lời', text: 'Kiểm tra micro, vào phòng thi và ghi âm câu trả lời cho từng câu hỏi ngay trên trình duyệt.' },
  { step: '03', title: 'Nhận dạng & chấm điểm', text: 'Giọng nói được chuyển thành văn bản, đối chiếu ý chính theo barem để gợi ý điểm.' },
  { step: '04', title: 'Duyệt & công bố', text: 'Giảng viên xem lại, điều chỉnh điểm, nhận xét và công bố kết quả cho sinh viên.' },
];

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: 'mic', title: 'Phòng thi vấn đáp', text: 'Ghi âm theo từng câu, giới hạn thời gian và số lượt làm lại do giảng viên thiết lập.' },
  { icon: 'spark', title: 'Chấm điểm theo barem', text: 'Engine chấm cục bộ phân tích độ bao phủ ý, thuật ngữ và đưa ra nhận xét chi tiết.' },
  { icon: 'shield', title: 'Phân quyền minh bạch', text: 'Barem không bao giờ hiển thị cho sinh viên; đáp án chỉ mở khi giảng viên cho phép.' },
  { icon: 'history', title: 'Lịch sử & xếp hạng', text: 'Sinh viên theo dõi tiến bộ qua từng bài, so sánh với lớp qua bảng xếp hạng.' },
  { icon: 'tasks', title: 'Lịch hạn nộp & việc cá nhân', text: 'Lịch tổng hợp hạn nộp các lớp, kèm danh sách việc cần làm của riêng bạn.' },
  { icon: 'telemetry', title: 'Thống kê lớp học', text: 'Phổ điểm, tỉ lệ nộp bài và từng bài nộp được tổng hợp trực quan cho giảng viên.' },
];

const roles: { tag: string; title: string; text: string; points: string[]; href: string; cta: string; icon: IconName; featured: boolean }[] = [
  {
    tag: 'Phân hệ 01',
    title: 'Cổng Sinh viên',
    text: 'Tham gia lớp bằng mã, làm bài vấn đáp, xem điểm và nhận xét sau khi được công bố.',
    points: ['Tham gia lớp bằng mã', 'Thử micro trước khi thi', 'Xem kết quả & lịch sử'],
    href: '/student',
    cta: 'Vào Cổng Sinh viên',
    icon: 'backpack',
    featured: false,
  },
  {
    tag: 'Phân hệ 02',
    title: 'Studio Giảng viên',
    text: 'Soạn đề, nhập nhanh câu hỏi từ tài liệu, chấm bài với gợi ý tự động và công bố điểm.',
    points: ['Soạn đề & barem chấm', 'Chấm tự động có kiểm duyệt', 'Thống kê theo lớp'],
    href: '/teacher',
    cta: 'Vào Studio Giảng viên',
    icon: 'edit',
    featured: true,
  },
  {
    tag: 'Phân hệ 03',
    title: 'Trung tâm Quản trị',
    text: 'Phê duyệt yêu cầu mở lớp, quản lý người dùng và theo dõi hoạt động toàn hệ thống.',
    points: ['Duyệt yêu cầu mở lớp', 'Quản lý tài khoản', 'Giám sát lớp học'],
    href: '/admin',
    cta: 'Vào Cổng Quản trị',
    icon: 'shield',
    featured: false,
  },
];

const analysis: [string, number][] = [['Độ bao phủ ý chính', 86], ['Thuật ngữ chuyên môn', 92], ['Mạch lạc & cấu trúc', 74]];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col text-gray-900">
      {/* Điều hướng */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/70 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <BrandLogo href="/" subtitle="Khảo thí vấn đáp thông minh" tone="light" />
          <nav aria-label="Mục trang" className="hidden items-center gap-7 text-[13px] font-medium text-brand-100/70 md:flex">
            <a href="#workflow" className="transition hover:text-white">Quy trình</a>
            <a href="#features" className="transition hover:text-white">Tính năng</a>
            <a href="#roles" className="transition hover:text-white">Phân hệ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
              Đăng nhập
            </Link>
            <Link href="/signup" className="hidden rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-sm transition hover:bg-brand-50 sm:inline-flex">
              Đăng ký Sinh viên
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-ink pb-24 pt-36 text-white sm:pt-40">
          <span aria-hidden="true" className="absolute -left-40 top-0 h-[560px] w-[560px] rounded-full bg-brand-600/35 blur-[120px]" />
          <span aria-hidden="true" className="absolute -right-40 bottom-[-200px] h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-[120px]" />
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1.1fr_1fr] lg:px-8">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[12px] font-medium text-brand-100/80">
                <span className="rounded-full bg-gradient-to-r from-brand-400 to-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">Mới</span>
                Nhận dạng giọng nói tiếng Việt & chấm theo barem
              </p>
              <h1 className="mt-6 text-[40px] font-extrabold leading-[1.06] tracking-tight sm:text-[56px]">
                Thi vấn đáp trực tuyến{' '}
                <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-emerald-300 bg-clip-text text-transparent">
                  chuẩn mực & minh bạch
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-8 text-brand-100/65 sm:text-[17px]">
                AIOralCheck giúp giảng viên tổ chức thi vấn đáp cho cả lớp, sinh viên trả lời bằng giọng nói ở bất kỳ đâu, và mọi bài làm được đánh giá nhất quán theo cùng một barem.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3.5 text-[14px] font-semibold text-white shadow-[0_14px_30px_-12px_rgb(106_85_247/0.9)] transition hover:brightness-110"
                >
                  Bắt đầu ngay
                  <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <a href="#workflow" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-white/10">
                  Xem quy trình
                </a>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                {[['3', 'Phân hệ theo vai trò'], ['100%', 'Chấm cục bộ trên máy chủ'], ['24/7', 'Làm bài mọi lúc trước hạn']].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-[26px] font-bold text-white">{value}</dd>
                    <dd className="mt-1 text-[12px] leading-5 text-brand-100/55">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Mô phỏng phòng thi (minh họa) */}
            <div className="relative animate-fade-up [animation-delay:120ms]" aria-hidden="true">
              <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-brand-500/25 to-emerald-400/10 blur-2xl" />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-200/60">IE104 · Giữa kỳ</p>
                    <p className="font-display mt-1 text-[17px] font-semibold">Câu 2 · Trình bày mô hình MVC</p>
                  </div>
                  <span className="flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />REC
                  </span>
                </div>
                <div className="mt-6 flex h-24 items-center gap-[4px]">
                  {waveform.map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 origin-center animate-wave rounded-full bg-gradient-to-t from-brand-500 to-emerald-300"
                      style={{ height: `${height}%`, animationDelay: `${(index % 10) * 100}ms` }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between font-mono text-[12px] text-brand-100/60">
                  <span>01:24.36</span>
                  <span>Giới hạn 03:00</span>
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-ink/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">Phân tích câu trả lời</p>
                  <div className="mt-3 space-y-2.5">
                    {analysis.map(([label, value]) => (
                      <div key={label}>
                        <div className="flex justify-between text-[12px] text-brand-100/75">
                          <span>{label}</span>
                          <span className="font-mono">{value}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-gradient-to-r from-brand-400 to-emerald-300" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quy trình */}
        <section id="workflow" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-600">Quy trình</p>
            <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[38px]">Từ đề thi đến bảng điểm, trong bốn bước</h2>
            <p className="mt-4 text-[15px] leading-7 text-gray-500">Mọi khâu của một buổi vấn đáp truyền thống, nay diễn ra trực tuyến và lưu vết đầy đủ.</p>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <li key={item.step} className="group relative rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <span className="font-mono text-[13px] font-semibold text-brand-600">{item.step}</span>
                <h3 className="mt-4 text-[17px] font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-gray-500">{item.text}</p>
                <span aria-hidden="true" className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-0 transition group-hover:opacity-100" />
              </li>
            ))}
          </ol>
        </section>

        {/* Tính năng */}
        <section id="features" className="scroll-mt-20 border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-600">Tính năng</p>
              <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[38px]">Được thiết kế riêng cho thi vấn đáp</h2>
              <p className="mt-4 text-[15px] leading-7 text-gray-500">Không dùng dịch vụ AI thương mại — nhận dạng giọng nói và chấm điểm chạy trên máy chủ của hệ thống.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-gray-200 bg-gray-200 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="bg-white p-7 transition hover:bg-gray-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 ring-1 ring-brand-200/60">
                    <Icon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[16px] font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-gray-500">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Phân hệ */}
        <section id="roles" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-600">Phân hệ</p>
            <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[38px]">Một nền tảng, ba không gian làm việc</h2>
            <p className="mt-4 text-[15px] leading-7 text-gray-500">Mỗi tài khoản chỉ thấy đúng những gì vai trò của mình cần.</p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {roles.map((role) => (
              <article
                key={role.title}
                className={`relative flex flex-col rounded-3xl p-7 transition hover:-translate-y-1 ${role.featured ? 'bg-ink text-white shadow-xl ring-1 ring-brand-500/30' : 'border border-gray-200 bg-white shadow-sm hover:shadow-lg'}`}
              >
                {role.featured && (
                  <>
                    <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-0 h-40 w-40 rounded-full bg-brand-500/30 blur-3xl" />
                    <span className="absolute -top-3 right-7 rounded-full bg-gradient-to-r from-brand-400 to-emerald-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink">Trọng tâm</span>
                  </>
                )}
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${role.featured ? 'bg-white/10 text-brand-200' : 'bg-brand-50 text-brand-700'}`}>
                  <Icon name={role.icon} className="h-6 w-6" />
                </span>
                <p className={`relative mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] ${role.featured ? 'text-brand-200/60' : 'text-gray-400'}`}>{role.tag}</p>
                <h3 className="relative mt-1 text-[20px] font-bold">{role.title}</h3>
                <p className={`relative mt-3 text-[14px] leading-6 ${role.featured ? 'text-brand-100/65' : 'text-gray-500'}`}>{role.text}</p>
                <ul className="relative mb-8 mt-5 space-y-2.5">
                  {role.points.map((point) => (
                    <li key={point} className={`flex items-center gap-2.5 text-[13px] ${role.featured ? 'text-brand-50/90' : 'text-gray-700'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${role.featured ? 'bg-emerald-400/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                        <Icon name="check" className="h-3 w-3" strokeWidth={2.4} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  href={role.href}
                  className={`relative mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition ${role.featured ? 'bg-white text-ink hover:bg-brand-50' : 'border border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  {role.cta}
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Kêu gọi hành động */}
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-800 via-brand-700 to-ink px-8 py-14 text-center text-white shadow-xl sm:px-16">
            <span aria-hidden="true" className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-400/30 blur-3xl" />
            <span aria-hidden="true" className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
            <h2 className="relative text-[28px] font-bold leading-tight sm:text-[36px]">Sẵn sàng cho buổi vấn đáp tiếp theo?</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[15px] leading-7 text-brand-100/75">Tạo tài khoản sinh viên trong một phút, hoặc đăng nhập bằng tài khoản giảng viên được cấp.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-ink shadow-lg transition hover:bg-brand-50">Đăng ký Sinh viên</Link>
              <Link href="/login" className="rounded-full border border-white/25 px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10">Đăng nhập</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-10 text-[13px] text-gray-500 md:flex-row lg:px-8">
          <BrandLogo href="/" size="sm" subtitle="Đồ án IE104 · Nhóm 3" />
          <nav aria-label="Liên kết chân trang" className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/login" className="transition hover:text-gray-900">Đăng nhập</Link>
            <Link href="/signup" className="transition hover:text-gray-900">Đăng ký</Link>
            <Link href="/teacher" className="transition hover:text-gray-900">Giảng viên</Link>
            <Link href="/student" className="transition hover:text-gray-900">Sinh viên</Link>
          </nav>
          <p className="text-center text-[12px] text-gray-400">© 2026 Nhóm 3 · Trường ĐH Công nghệ Thông tin, ĐHQG-HCM</p>
        </div>
      </footer>
    </div>
  );
}
