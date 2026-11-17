'use client';

import React from 'react';
import Link from 'next/link';

type AdminPage = 'overview' | 'users' | 'approvals' | 'classes' | 'settings';

interface AdminSidebarProps {
  currentPage: AdminPage;
}

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const itemClass =
    'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] text-gray-600 transition hover:bg-gray-100 hover:text-black';
  const activeClass = 'border-l-2 border-black bg-[#ededed] font-semibold text-[#202124]';

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[255px] flex-col border-r border-[#e6e6e6] bg-[#fbfbfb] md:flex">
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e8e8e8] px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111] text-white">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
              <path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z M9 12l2 2 4-4" />
            </svg>
          </span>
          <span>
            <b className="block text-[15px] leading-tight">
              AIOralCheck
            </b>
            <span className="text-[10px] text-gray-500">Cổng Quản trị viên</span>
          </span>
        </Link>
      </div>

      <nav aria-label="Điều hướng quản trị" className="flex flex-1 flex-col px-4 py-4">
        <div className="space-y-1">
          <Link
            href="/admin"
            aria-current={currentPage === 'overview' ? 'page' : undefined}
            className={`${itemClass} ${currentPage === 'overview' ? activeClass : ''}`}
          >
            <span aria-hidden="true">📊</span>
            <span>Tổng quan hệ thống</span>
          </Link>

          <Link
            href="/admin/classes"
            aria-current={currentPage === 'classes' ? 'page' : undefined}
            className={`${itemClass} ${currentPage === 'classes' ? activeClass : ''}`}
          >
            <span aria-hidden="true">🏫</span>
            <span>Quản trị Lớp &amp; Phân bổ AI</span>
          </Link>

          <Link
            href="/admin/approvals#approval-requests"
            aria-current={currentPage === 'approvals' ? 'page' : undefined}
            className={`${itemClass} ${currentPage === 'approvals' ? activeClass : ''}`}
          >
            <span aria-hidden="true">⚖️</span>
            <span>Duyệt lớp &amp; Học vị GV</span>
          </Link>

          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('user-management-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-current={currentPage === 'users' ? 'page' : undefined}
            className={`${itemClass} ${currentPage === 'users' ? activeClass : ''}`}
          >
            <span aria-hidden="true">👥</span>
            <span>Quản lý Người dùng</span>
          </Link>

          <div className="mt-4 border-t border-[#e6e6e6] pt-4">
            <span className="mb-1 block px-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Phân hệ
            </span>
            <Link
              href="/teacher/classes"
              className={itemClass}
            >
              <span aria-hidden="true">🎓</span>
              <span>Quản lý lớp &amp; bài tập</span>
            </Link>

            <Link
              href="/student"
              className={itemClass}
            >
              <span aria-hidden="true">🎒</span>
              <span>Cổng Sinh viên</span>
            </Link>
          </div>
        </div>

        <div className="mt-auto -mx-4 border-t border-[#e6e6e6] px-4 pt-4">
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#e4e4e4] bg-white p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold">AD</span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[10px]">Quản trị viên</b>
              <span className="block truncate text-[9px] text-gray-500">Quyền quản trị hệ thống</span>
            </span>
          </div>

          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e4e4e4] bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            <span>Đăng xuất</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
