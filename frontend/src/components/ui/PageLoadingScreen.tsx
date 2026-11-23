import { BrandMark } from '@/components/ui/Brand';

interface PageLoadingScreenProps {
  title?: string;
  description?: string;
}

export default function PageLoadingScreen({
  title = 'Đang tải dữ liệu',
  description = 'Vui lòng đợi trong giây lát.',
}: PageLoadingScreenProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center px-5 py-10"
    >
      <section className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="relative mx-auto flex w-fit">
          <BrandMark size="lg" animated />
        </div>
        <h1 className="relative mt-6 text-base font-semibold text-gray-900">{title}</h1>
        <p className="relative mt-2 text-sm leading-6 text-gray-500">{description}</p>
        <div className="relative mx-auto mt-6 h-1 w-32 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-brand-400 via-brand-600 to-emerald-400" />
        </div>
      </section>
    </main>
  );
}
