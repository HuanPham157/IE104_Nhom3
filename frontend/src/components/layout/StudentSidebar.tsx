import AppSidebar, { SidebarUserCard, sidebarIconButton } from '@/components/layout/AppSidebar';
import { Icon } from '@/components/ui/Brand';

type StudentPage = 'overview' | 'tasks' | 'classes' | 'history' | 'profile' | 'recorder';
type SidebarAction = 'classes' | 'audio' | 'history' | 'settings';

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
  return (
    <AppSidebar
      homeHref="/student"
      subtitle="Cổng Học tập Sinh viên"
      navLabel="Điều hướng sinh viên"
      sections={[
        {
          title: 'Học tập',
          items: [
            { key: 'overview', label: 'Tổng quan', icon: 'overview', href: '/student', active: currentPage === 'overview', mobile: true },
            { key: 'classes', label: 'Lớp học của tôi', shortLabel: 'Lớp học', icon: 'book', href: '/student/classes', active: currentPage === 'classes', mobile: true },
            { key: 'tasks', label: 'Việc cá nhân', shortLabel: 'Việc', icon: 'tasks', href: '/tasks', active: currentPage === 'tasks', mobile: true },
            { key: 'history', label: 'Lịch sử & Bảng xếp hạng', shortLabel: 'Lịch sử', icon: 'history', href: '/student/history', active: currentPage === 'history', mobile: true },
          ],
        },
        {
          title: 'Công cụ',
          items: [
            { key: 'recorder', label: 'Thử micro', icon: 'mic', href: '/student/recorder', active: currentPage === 'recorder' },
            { key: 'profile', label: 'Cài đặt tài khoản', shortLabel: 'Tài khoản', icon: 'settings', href: '/student/profile', active: currentPage === 'profile', mobile: true },
          ],
        },
      ]}
      footer={
        <div className="space-y-3">
          <SidebarUserCard
            name={fullName}
            detail={`MSSV: ${institutionalId || '—'}`}
            action={
              <button type="button" onClick={onSignOut} disabled={signingOut} aria-label="Đăng xuất" title="Đăng xuất" className={sidebarIconButton}>
                <Icon name="logout" className="h-4 w-4" />
              </button>
            }
          />
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-2 text-[10px] font-semibold tracking-wide text-emerald-300">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Sẵn sàng thi vấn đáp
            </span>
            <Icon name="wave" className="h-3.5 w-3.5" />
          </div>
        </div>
      }
    />
  );
}
