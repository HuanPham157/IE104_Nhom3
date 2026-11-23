import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { BrandLogo, Icon, type IconName } from '@/components/ui/Brand';

export interface SidebarItem {
  key: string;
  label: string;
  /** Nhãn ngắn cho thanh điều hướng di động */
  shortLabel?: string;
  icon: IconName;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** Hiện trên thanh điều hướng di động (tối đa 5 mục) */
  mobile?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface AppSidebarProps {
  homeHref: string;
  subtitle: string;
  navLabel: string;
  sections: SidebarSection[];
  footer?: ReactNode;
}

const baseItem =
  'group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-all duration-200';
const activeItem =
  'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] before:absolute before:inset-y-2 before:-left-4 before:w-[3px] before:rounded-r-full before:bg-gradient-to-b before:from-brand-300 before:to-emerald-300';
const idleItem = 'text-brand-100/65 hover:bg-white/[0.05] hover:text-white';

function ItemContent({ item }: { item: SidebarItem }) {
  return (
    <>
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${item.active ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_4px_12px_-4px_rgb(106_85_247/0.8)]' : 'text-brand-200/70 group-hover:text-white'}`}>
        <Icon name={item.icon} className="h-[16px] w-[16px]" />
      </span>
      <span className="truncate">{item.label}</span>
    </>
  );
}

function SidebarLink({ item }: { item: SidebarItem }) {
  const className = `${baseItem} ${item.active ? activeItem : idleItem} ${item.disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`;
  if (item.href && !item.disabled) {
    return (
      <Link href={item.href} onClick={item.onClick} aria-current={item.active ? 'page' : undefined} className={className} title={item.title}>
        <ItemContent item={item} />
      </Link>
    );
  }
  return (
    <button type="button" onClick={item.onClick} disabled={item.disabled} title={item.title} className={className}>
      <ItemContent item={item} />
    </button>
  );
}

function MobileNav({ items, label }: { items: SidebarItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={`${label} (di động)`}
      className="oc-mobile-nav fixed inset-x-3 bottom-3 z-30 flex items-center justify-around gap-1 rounded-2xl border border-white/10 bg-ink/90 px-2 py-1.5 shadow-xl backdrop-blur-xl md:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const className = `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${item.active ? 'bg-white/10 text-white' : 'text-brand-100/60 hover:text-white'}`;
        const content = (
          <>
            <Icon name={item.icon} className={`h-5 w-5 ${item.active ? 'text-brand-300' : ''}`} />
            <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
          </>
        );
        return item.href ? (
          <Link key={item.key} href={item.href} onClick={item.onClick} aria-current={item.active ? 'page' : undefined} className={className}>{content}</Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} disabled={item.disabled} className={className}>{content}</button>
        );
      })}
    </nav>
  );
}

export default function AppSidebar({ homeHref, subtitle, navLabel, sections, footer }: AppSidebarProps) {
  const mobileItems = sections.flatMap((section) => section.items).filter((item) => item.mobile && !item.disabled).slice(0, 5);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[255px] flex-col overflow-hidden bg-ink text-white md:flex">
        {/* Hào quang nền */}
        <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-2/60 via-transparent to-transparent" />

        <div className="relative flex h-[72px] shrink-0 items-center border-b border-white/[0.07] px-5">
          <BrandLogo href={homeHref} subtitle={subtitle} tone="light" />
        </div>

        <nav aria-label={navLabel} className="relative flex min-h-0 flex-1 flex-col px-4 py-5">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 [scrollbar-color:rgb(255_255_255/0.15)_transparent]">
            {sections.map((section, index) => (
              <div key={section.title ?? index}>
                {section.title && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-200/40">{section.title}</p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => <SidebarLink key={item.key} item={item} />)}
                </div>
              </div>
            ))}
          </div>

          {footer && <div className="relative mt-4 border-t border-white/[0.07] pt-4">{footer}</div>}
        </nav>
      </aside>
      <MobileNav items={mobileItems} label={navLabel} />
    </>
  );
}

/** Thẻ người dùng ở chân sidebar. */
export function SidebarUserCard({ name, detail, action, initials: initialsOverride }: { name: string; detail: string; action?: ReactNode; initials?: string }) {
  const initials = initialsOverride ?? (name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('') || 'U');
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-emerald-400 text-xs font-bold text-ink">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[12px] font-semibold text-white">{name}</b>
        <span className="block truncate text-[10px] text-brand-100/55">{detail}</span>
      </span>
      {action}
    </div>
  );
}

export const sidebarIconButton =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-100/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50';
