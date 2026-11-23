import Link from 'next/link';

const icons = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  classes: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c3 2 9 2 12 0v-5 M22 9v6',
  tasks: 'M9 5h10 M9 12h10 M9 19h10 M4 5h.01 M4 12h.01 M4 19h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  wave: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14',
  telemetry: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  profile: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z M9 12l2 2 4-4',
  check: 'M20 6 9 17l-5-5',
  edit: 'M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  arrow: 'M5 12h14 M13 5l7 7-7 7',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M5.6 18.4l2.8-2.8 M15.6 8.4l2.8-2.8',
  backpack: 'M5 10a7 7 0 0 1 14 0v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M9 4.5V3h6v1.5 M8 14h8 M8 21v-4h8v4',
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name, className = 'h-[18px] w-[18px]', strokeWidth = 1.7 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24">
      <path d={icons[name]} />
    </svg>
  );
}

/** Biểu tượng sóng âm — nhận diện thương hiệu AIOralCheck. */
export function BrandMark({ size = 'md', animated = false }: { size?: 'sm' | 'md' | 'lg'; animated?: boolean }) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg gap-[2px]' : size === 'lg' ? 'h-12 w-12 rounded-2xl gap-[3px]' : 'h-9 w-9 rounded-xl gap-[2.5px]';
  const bar = size === 'lg' ? 'w-[4px]' : 'w-[3px]';
  const heights = size === 'lg' ? ['h-3', 'h-6', 'h-8', 'h-5', 'h-3'] : size === 'sm' ? ['h-1.5', 'h-3', 'h-4', 'h-2.5', 'h-1.5'] : ['h-2', 'h-4', 'h-5', 'h-3', 'h-2'];
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-800 to-ink shadow-[0_6px_18px_-6px_rgb(86_64_230/0.7)] ring-1 ring-white/15 ${box}`}>
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.28),transparent_55%)]" />
      {heights.map((height, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`relative rounded-full bg-gradient-to-t from-brand-200 to-white ${bar} ${height} ${animated ? 'origin-center animate-wave' : ''}`}
          style={animated ? { animationDelay: `${index * 120}ms` } : undefined}
        />
      ))}
    </span>
  );
}

export function BrandLogo({ href = '/', subtitle, tone = 'dark', size = 'md' }: { href?: string; subtitle?: string; tone?: 'dark' | 'light'; size?: 'sm' | 'md' }) {
  return (
    <Link href={href} className="group flex items-center gap-3" aria-label="AIOralCheck">
      <BrandMark size={size} />
      <span className="leading-tight">
        <span className={`font-display block text-[15px] font-bold tracking-tight ${tone === 'light' ? 'text-white' : 'text-gray-900'}`}>
          AIOral<span className={tone === 'light' ? 'text-brand-300' : 'text-brand-600'}>Check</span>
        </span>
        {subtitle && (
          <span className={`block text-[10px] font-medium tracking-wide ${tone === 'light' ? 'text-brand-200/70' : 'text-gray-500'}`}>{subtitle}</span>
        )}
      </span>
    </Link>
  );
}
