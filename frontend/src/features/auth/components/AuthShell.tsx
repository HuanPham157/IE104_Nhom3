import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo, Icon } from '@/components/ui/Brand';

const waveform = [22, 38, 54, 30, 66, 44, 80, 58, 36, 72, 48, 90, 62, 40, 70, 52, 34, 60, 46, 28, 56, 74, 42, 32, 50, 26];

const highlights = [
  { icon: 'mic' as const, title: 'Ghi âm câu trả lời ngay trên trình duyệt', text: 'Thử micro, ghi âm từng câu và nộp lại trong giới hạn lượt cho phép.' },
  { icon: 'spark' as const, title: 'Nhận dạng giọng nói & chấm theo barem', text: 'Bản ghi được chuyển thành văn bản và đối chiếu với hướng dẫn chấm của giảng viên.' },
  { icon: 'shield' as const, title: 'Phân quyền chặt chẽ theo vai trò', text: 'Sinh viên, giảng viên và quản trị viên chỉ thấy đúng dữ liệu của mình.' },
];

export default function AuthShell({ mode, children }: { mode: 'login' | 'signup'; children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Cột thương hiệu */}
      <section className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col">
        <span aria-hidden="true" className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/35 blur-[110px]" />
        <span aria-hidden="true" className="absolute -bottom-48 right-[-120px] h-[460px] w-[460px] rounded-full bg-emerald-500/15 blur-[110px]" />
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />

        <div className="relative flex flex-1 flex-col px-12 py-10 xl:px-16">
          <BrandLogo href="/" subtitle="Khảo thí vấn đáp thông minh" tone="light" />

          <div className="my-auto max-w-[520px] py-12">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-brand-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Đồ án IE104 · Nhóm 3 · UIT
            </p>
            <h1 className="mt-6 text-[40px] font-bold leading-[1.1] tracking-tight xl:text-[46px]">
              Thi vấn đáp trực tuyến,{' '}
              <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-emerald-300 bg-clip-text text-transparent">
                chấm điểm minh bạch.
              </span>
            </h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-7 text-brand-100/65">
              Một không gian thống nhất để giảng viên ra đề, sinh viên trả lời bằng giọng nói và kết quả được đánh giá nhất quán theo barem.
            </p>

            {/* Mô phỏng phiên thi */}
            <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2 font-medium text-brand-100/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                  </span>
                  Đang ghi âm · Câu 2/5
                </span>
                <span className="font-mono text-brand-100/60">01:24.36</span>
              </div>
              <div className="mt-4 flex h-16 items-center gap-[5px]" aria-hidden="true">
                {waveform.map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 origin-center animate-wave rounded-full bg-gradient-to-t from-brand-500 to-emerald-300"
                    style={{ height: `${height}%`, animationDelay: `${(index % 9) * 110}ms` }}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[['Độ bao phủ ý', '86%'], ['Thuật ngữ', '9/10'], ['Điểm dự kiến', '8.5']].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/[0.05] px-2 py-2.5">
                    <p className="font-mono text-[15px] font-semibold text-white">{value}</p>
                    <p className="mt-0.5 text-[10px] text-brand-100/55">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <ul className="mt-8 space-y-4">
              {highlights.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-200">
                    <Icon name={item.icon} className="h-4 w-4" />
                  </span>
                  <span>
                    <b className="block text-[13px] font-semibold text-white">{item.title}</b>
                    <span className="block text-[12px] leading-5 text-brand-100/55">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-brand-100/40">© 2026 AIOralCheck · Trường Đại học Công nghệ Thông tin, ĐHQG-HCM</p>
        </div>
      </section>

      {/* Cột biểu mẫu */}
      <section className="relative flex min-h-screen flex-col bg-gradient-to-b from-white to-gray-50">
        <header className="flex h-[68px] items-center justify-between px-5 sm:px-10">
          <span className="lg:hidden"><BrandLogo href="/" size="sm" /></span>
          <span className="hidden lg:block" />
          <nav aria-label="Tài khoản" className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 text-[12px] shadow-xs">
            <Link
              href="/login"
              aria-current={mode === 'login' ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 font-medium transition ${mode === 'login' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Đăng nhập
            </Link>
            <Link
              href="/signup"
              aria-current={mode === 'signup' ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 font-medium transition ${mode === 'signup' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Đăng ký
            </Link>
          </nav>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-[420px] animate-fade-up">{children}</div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-5 pb-6 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5"><Icon name="lock" className="h-3.5 w-3.5" />Kết nối được mã hóa</span>
          <span>Quy chuẩn dữ liệu âm thanh</span>
          <span>Điều khoản dịch vụ</span>
        </footer>
      </section>
    </main>
  );
}

export const authInputClass =
  'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[14px] text-gray-900 shadow-xs outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60';

export const authLabelClass = 'mb-1.5 flex items-center justify-between text-[12px] font-semibold text-gray-700';

export const authPrimaryButton =
  'group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(86_64_230/0.9)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';
