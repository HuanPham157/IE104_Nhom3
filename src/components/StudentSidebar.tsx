import Link from 'next/link';

type StudentPage = 'overview' | 'tasks' | 'classes' | 'history' | 'profile' | 'recorder';
type SidebarAction = 'classes' | 'audio' | 'history' | 'settings';

const iconPaths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  classes: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  tasks: 'M9 5h10 M9 12h10 M9 19h10 M4 5h.01 M4 12h.01 M4 19h.01',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z',
  sound: 'M11 5 6 9H2v6h4l5 4z M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14',
  logout: 'M10 17l5-5-5-5 M15 12H3 M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6',
} as const;

function SidebarIcon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d={iconPaths[name]} />
    </svg>
  );
}

interface StudentSidebarProps {
  currentPage: StudentPage;
  fullName: string;
  institutionalId: string;
  signingOut: boolean;
  interactiveUnavailable?: boolean;
  onSignOut: () => void;
  onUnavailable?: (action: SidebarAction) => void;
}

export default function StudentSidebar({
  currentPage,
  fullName,
  institutionalId,
  signingOut,
  onSignOut,
}: StudentSidebarProps) {
  const initials = fullName.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');
  const itemClass = 'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:hover:bg-transparent transition';
  const activeClass = 'border-l-2 border-black bg-[#ededed] font-semibold text-[#202124]';

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[255px] flex-col border-r border-[#e6e6e6] bg-[#fbfbfb] md:flex">
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e8e8e8] px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white">
          <SidebarIcon name="sound" />
        </span>
        <span>
          <b className="block text-[15px] leading-tight">AIOralCheck</b>
          <span className="text-[10px] text-gray-500">Cổng Học tập Sinh viên</span>
        </span>
      </div>

      <nav aria-label="Điều hướng sinh viên" className="flex flex-1 flex-col px-4 py-4">
        <div className="space-y-1">
          <Link
            href="/student"
            className={`${itemClass} ${currentPage === 'overview' ? activeClass : ''}`}
          >
            <SidebarIcon name="overview" />
            Tổng quan
          </Link>

          <Link
            href="/student/classes"
            className={`${itemClass} ${currentPage === 'classes' ? activeClass : ''}`}
          >
            <SidebarIcon name="classes" />
            Lớp học của tôi
          </Link>

          <Link
            href="/tasks"
            className={`${itemClass} ${currentPage === 'tasks' ? activeClass : ''}`}
          >
            <SidebarIcon name="tasks" />
            Bài tập oral
          </Link>

          <Link
            href="/student/exam/CS102-MID-2024-03"
            className={itemClass}
          >
            <SidebarIcon name="mic" />
            Phòng thi vấn đáp AI
          </Link>

          <Link
            href="/student/history"
            className={`${itemClass} ${currentPage === 'history' ? activeClass : ''}`}
          >
            <SidebarIcon name="history" />
            Lịch sử &amp; Bảng xếp hạng
          </Link>

          <Link
            href="/student/profile"
            className={`${itemClass} ${currentPage === 'profile' ? activeClass : ''}`}
          >
            <SidebarIcon name="settings" />
            Cài đặt tài khoản
          </Link>
        </div>

        <div className="mt-auto -mx-4 border-t border-[#e6e6e6] px-4 pt-4">
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#e4e4e4] bg-white p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">{initials}</span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[10px]">{fullName}</b>
              <span className="block truncate text-[9px] text-gray-500">MSSV: {institutionalId || '—'}</span>
            </span>
            <button type="button" onClick={onSignOut} disabled={signingOut} aria-label="Đăng xuất" className="rounded p-1 text-gray-600 hover:bg-gray-100">
              <SidebarIcon name="logout" />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#8fe0b5] bg-[#effaf4] px-2.5 py-2 text-[9px] font-semibold text-[#087b48]">
            <span>● &nbsp;MIC: SẴN SÀNG -14 DB</span>
            <SidebarIcon name="sound" />
          </div>
        </div>
      </nav>
    </aside>
  );
}
