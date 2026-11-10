import Link from 'next/link';

export default function DeferredFeatureNotice({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-5 text-[#202124]">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm">
        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold text-gray-600">TÍNH NĂNG TẠM HOÃN</span>
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
        <Link href={backHref} className="mt-6 inline-flex min-h-10 items-center rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-gray-800">
          {backLabel}
        </Link>
      </section>
    </main>
  );
}
