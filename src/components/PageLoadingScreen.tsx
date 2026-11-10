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
      className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-10"
    >
      <section className="w-full max-w-sm rounded-3xl border border-[#e7e9ef] bg-white p-8 text-center shadow-[0_12px_40px_rgba(25,35,55,0.07)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0efff]">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#d8d5ff] border-t-[#4f46e5]" />
        </div>
        <h1 className="mt-5 text-base font-semibold text-[#202124]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[#69707d]">{description}</p>
        <div className="mx-auto mt-6 flex w-24 items-center justify-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a5a0f5]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a5a0f5] [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a5a0f5] [animation-delay:300ms]" />
        </div>
      </section>
    </main>
  );
}
