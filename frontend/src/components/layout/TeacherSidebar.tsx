'use client';

import AppSidebar, { type SidebarItem } from '@/components/layout/AppSidebar';
import { Icon } from '@/components/ui/Brand';

type TeacherPage = 'overview' | 'classes' | 'evaluations' | 'builder' | 'profile' | 'settings';

interface TeacherSidebarProps {
  currentPage: TeacherPage;
  signingOut: boolean;
  onSignOut: () => void;
  adminMode?: boolean;
  onUnavailable?: (title: string) => void;
}

export default function TeacherSidebar({ currentPage, signingOut, onSignOut, adminMode = false, onUnavailable }: TeacherSidebarProps) {
  const mainItems: SidebarItem[] = [
    { key: 'overview', label: adminMode ? 'Tổng quan quản trị' : 'Tổng quan', shortLabel: 'Tổng quan', icon: 'overview', href: adminMode ? '/admin' : '/teacher', active: currentPage === 'overview', mobile: true },
    { key: 'classes', label: adminMode ? 'Lớp học & Bài tập' : 'Lớp học & Hội đồng', shortLabel: 'Lớp học', icon: 'classes', href: '/teacher/classes', active: currentPage === 'classes', mobile: true },
    { key: 'builder', label: 'Soạn bài tập', shortLabel: 'Soạn đề', icon: 'edit', href: '/teacher/assignments/create', active: currentPage === 'builder', mobile: true },
  ];

  const sections = [{ title: 'Giảng dạy', items: mainItems }];

  if (!adminMode) {
    sections.push(
      {
        title: 'Tài khoản',
        items: [
          { key: 'profile', label: 'Hồ sơ cán bộ & Học vị', shortLabel: 'Hồ sơ', icon: 'profile', href: '/teacher/profile', active: currentPage === 'profile', mobile: true },
          { key: 'settings', label: 'Cài đặt hệ thống', shortLabel: 'Cài đặt', icon: 'settings', href: '/teacher/settings', active: currentPage === 'settings', mobile: true },
        ],
      },
      {
        title: 'Sắp ra mắt',
        items: [
          { key: 'recordings', label: 'Kho bản ghi âm', icon: 'wave', onClick: () => onUnavailable?.('Kho bản ghi âm') },
          { key: 'telemetry', label: 'Giám sát AI Telemetry', icon: 'telemetry', onClick: () => onUnavailable?.('Giám sát AI Telemetry') },
        ],
      },
    );
  }

  return (
    <AppSidebar
      homeHref={adminMode ? '/admin' : '/teacher'}
      subtitle={adminMode ? 'Studio quản trị' : 'Studio Giảng viên'}
      navLabel={adminMode ? 'Điều hướng quản trị viên' : 'Điều hướng giảng viên'}
      sections={sections}
      footer={
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onUnavailable?.('Trợ giúp & Hướng dẫn')}
            className="flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[12px] font-medium text-brand-100/65 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Icon name="help" className="h-4 w-4" />Trợ giúp &amp; Hướng dẫn
          </button>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            className="flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[12px] font-medium text-brand-100/65 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-60"
          >
            <Icon name="logout" className="h-4 w-4" />{signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
          </button>
        </div>
      }
    />
  );
}
