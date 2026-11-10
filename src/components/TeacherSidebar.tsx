'use client';

import Link from 'next/link';

type TeacherPage = 'overview' | 'classes' | 'evaluations' | 'builder' | 'profile' | 'settings';

const iconPaths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M2 9l10-5 10 5-10 5L2 9z M6 11v5c3 2 9 2 12 0v-5 M22 9v6',
  exam: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  recordings: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  telemetry: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
  wave: 'M3 10v4 M7 6v12 M11 3v18 M15 8v8 M19 5v14 M23 10v4',
  profile: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
} as const;

function SidebarIcon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg aria-hidden="true" className="h-[17px] w-[17px] shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

interface TeacherSidebarProps {
  currentPage: TeacherPage;
  signingOut: boolean;
  onSignOut: () => void;
  adminMode?: boolean;
  onUnavailable?: (title: string) => void;
  unavailableItemsInteractive?: boolean;
}

const navItemClass = 'flex h-[38px] w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] transition';

export default function TeacherSidebar({ currentPage, signingOut, onSignOut, adminMode = false, onUnavailable, unavailableItemsInteractive = true }: TeacherSidebarProps) {
  const activeClass = 'bg-[#ededed] font-semibold text-[#202124]';
  const inactiveClass = 'text-[#505258] hover:bg-[#ededed]';

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[255px] flex-col border-r border-[#e6e6e6] bg-[#fbfbfb] md:flex">
      <div className="flex h-[70px] shrink-0 items-center gap-3 border-b border-[#e8e8e8] px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white">
          <SidebarIcon name="wave" />
        </span>
        <span>
          <b className="block text-[13px]">AIOralCheck Studio</b>
          <span className="mt-0.5 block text-[9px] text-[#777]">Hệ thống khảo thí âm học AI</span>
        </span>
      </div>
      <nav aria-label={adminMode ? 'Điều hướng quản trị viên' : 'Điều hướng giảng viên'} className="flex flex-1 flex-col px-4 py-5">
        <div className="space-y-1">
          <Link href={adminMode ? '/admin' : '/teacher'} aria-current={currentPage === 'overview' ? 'page' : undefined} className={`${navItemClass} ${currentPage === 'overview' ? activeClass : inactiveClass}`}>
            <SidebarIcon name="overview" />{adminMode ? 'Tổng quan quản trị' : 'Tổng quan'}
          </Link>
          <Link href="/teacher/classes" aria-current={currentPage === 'classes' ? 'page' : undefined} className={`${navItemClass} ${currentPage === 'classes' ? activeClass : inactiveClass}`}>
            <SidebarIcon name="classes" />{adminMode ? 'Lớp học & Bài tập' : 'Lớp học & Hội đồng'}
          </Link>
          <Link href="/teacher/assignments/create" aria-current={currentPage === 'builder' ? 'page' : undefined} className={`${navItemClass} ${currentPage === 'builder' ? activeClass : inactiveClass}`}>
            <SidebarIcon name="exam" />Soạn bài tập
          </Link>
          {!adminMode && (
            <>
              <button type="button" disabled title="Chức năng đang tạm hoãn" className={`${navItemClass} ${inactiveClass} cursor-not-allowed opacity-50`}>
                <SidebarIcon name="wave" />Đánh giá AI (tạm hoãn)
              </button>
              <Link href="/teacher/profile" aria-current={currentPage === 'profile' ? 'page' : undefined} className={`${navItemClass} ${currentPage === 'profile' ? activeClass : inactiveClass}`}>
                <SidebarIcon name="profile" />Hồ sơ cán bộ &amp; Học vị
              </Link>
              <Link href="/teacher/settings" aria-current={currentPage === 'settings' ? 'page' : undefined} className={`${navItemClass} ${currentPage === 'settings' ? activeClass : inactiveClass}`}>
                <SidebarIcon name="settings" />Cài đặt hệ thống
              </Link>
              <button
                type="button"
                onClick={() => onUnavailable?.('Kho bản ghi âm')}
                className={`${navItemClass} ${inactiveClass}`}
              >
                <SidebarIcon name="recordings" />Kho bản ghi âm
              </button>
              <button
                type="button"
                onClick={() => onUnavailable?.('Giám sát AI Telemetry')}
                className={`${navItemClass} ${inactiveClass}`}
              >
                <SidebarIcon name="telemetry" />Giám sát AI Telemetry
              </button>
            </>
          )}
        </div>

        <div className="mt-auto border-t border-[#e3e3e3] pt-3">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#4e5053]">Hỗ trợ</p>
          <button
            type="button"
            onClick={() => onUnavailable?.('Trợ giúp & Hướng dẫn')}
            className={`${navItemClass} h-9 gap-2.5 text-[11px] ${inactiveClass}`}
          >
            <SidebarIcon name="help" />Trợ giúp &amp; Hướng dẫn
          </button>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className={`${navItemClass} h-9 gap-2.5 text-[11px] text-[#4c4c4c] hover:bg-[#ededed] disabled:opacity-60`}
          >
            <SidebarIcon name="logout" />{signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      </nav>
    </aside>
  );
}
