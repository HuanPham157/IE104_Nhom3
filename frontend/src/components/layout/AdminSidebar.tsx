'use client';

import Link from 'next/link';
import AppSidebar, { SidebarUserCard } from '@/components/layout/AppSidebar';
import { Icon } from '@/components/ui/Brand';

type AdminPage = 'overview' | 'users' | 'approvals' | 'classes' | 'settings';

interface AdminSidebarProps {
  currentPage: AdminPage;
}

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  return (
    <AppSidebar
      homeHref="/admin"
      subtitle="Trung tâm Điều hành"
      navLabel="Điều hướng quản trị"
      sections={[
        {
          title: 'Quản trị',
          items: [
            { key: 'overview', label: 'Tổng quan hệ thống', shortLabel: 'Tổng quan', icon: 'overview', href: '/admin', active: currentPage === 'overview', mobile: true },
            { key: 'classes', label: 'Quản trị Lớp & Phân bổ AI', shortLabel: 'Lớp học', icon: 'classes', href: '/admin/classes', active: currentPage === 'classes', mobile: true },
            { key: 'approvals', label: 'Duyệt lớp & Học vị GV', shortLabel: 'Phê duyệt', icon: 'shield', href: '/admin/approvals#approval-requests', active: currentPage === 'approvals', mobile: true },
            {
              key: 'users',
              label: 'Quản lý Người dùng',
              shortLabel: 'Người dùng',
              icon: 'users',
              href: '/admin',
              active: currentPage === 'users',
              mobile: true,
              onClick: (event) => {
                const el = document.getElementById('user-management-section');
                if (!el) return;
                event.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
              },
            },
          ],
        },
        {
          title: 'Phân hệ',
          items: [
            { key: 'teacher', label: 'Quản lý lớp & bài tập', icon: 'edit', href: '/teacher/classes' },
            { key: 'student', label: 'Cổng Sinh viên', icon: 'backpack', href: '/student' },
          ],
        },
      ]}
      footer={
        <div className="space-y-3">
          <SidebarUserCard name="Quản trị viên" detail="Quyền quản trị hệ thống" initials="AD" />
          <Link
            href="/login"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-[12px] font-semibold text-brand-100/80 transition hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Icon name="logout" className="h-4 w-4" />Đăng xuất
          </Link>
        </div>
      }
    />
  );
}
