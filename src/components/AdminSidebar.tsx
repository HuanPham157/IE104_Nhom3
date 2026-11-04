'use client';

import React from 'react';
import Link from 'next/link';

type AdminPage = 'overview' | 'users' | 'approvals' | 'classes' | 'settings';

interface AdminSidebarProps {
  currentPage: AdminPage;
}

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const itemClass =
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all';
  const activeClass =
    'bg-black text-white shadow-xs';
  const inactiveClass =
    'text-gray-600 hover:bg-gray-100 hover:text-black';

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white p-4 md:flex justify-between">
      <div className="space-y-5">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🛡️
          </span>
          <div>
            <span className="font-black text-sm tracking-tight text-[#111827] block leading-none">
              AIOralCheck
            </span>
            <span className="text-[9px] text-gray-500 font-semibold tracking-wide">
              ADMIN CONTROL PANEL
            </span>
          </div>
        </Link>

        {/* Live Admin Telemetry Pill */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Hạ tầng AI:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sẵn sàng 100%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-600 font-mono">
            <span>CoreAudio 48kHz</span>
            <span className="font-semibold text-gray-900">Latency: 12ms</span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1">
          <Link
            href="/admin"
            className={`${itemClass} ${currentPage === 'overview' ? activeClass : inactiveClass}`}
          >
            <span>📊</span>
            <span>Tổng quan hệ thống</span>
          </Link>

          <Link
            href="/admin/classes"
            className={`${itemClass} ${currentPage === 'classes' ? activeClass : inactiveClass}`}
          >
            <span>🏫</span>
            <span>Quản trị Lớp &amp; Phân bổ AI</span>
          </Link>

          <Link
            href="/admin/approvals"
            className={`${itemClass} ${currentPage === 'approvals' ? activeClass : inactiveClass}`}
          >
            <span>⚖️</span>
            <span>Duyệt lớp &amp; Học vị GV</span>
            <span className="ml-auto px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
              3 chờ
            </span>
          </Link>

          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('user-management-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`${itemClass} ${currentPage === 'users' ? activeClass : inactiveClass}`}
          >
            <span>👥</span>
            <span>Quản lý Người dùng</span>
          </Link>

          <div className="pt-2 border-t border-gray-100">
            <span className="px-3 text-[10px] font-bold uppercase text-gray-400 block mb-1">
              Chuyển nhanh phân hệ
            </span>
            <Link
              href="/teacher"
              className={`${itemClass} ${inactiveClass}`}
            >
              <span>🎓</span>
              <span>Cổng Giảng viên</span>
            </Link>

            <Link
              href="/student"
              className={`${itemClass} ${inactiveClass}`}
            >
              <span>🎒</span>
              <span>Cổng Sinh viên</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Footer User Info */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
          <span className="w-8 h-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center shrink-0">
            AD
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-gray-900 leading-tight">
              Admin Hệ Thống
            </span>
            <span className="block truncate text-[10px] text-gray-500">
              admin@aioralcheck.edu.vn
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
        >
          <span>Đăng xuất Admin</span>
        </Link>
      </div>
    </aside>
  );
}
