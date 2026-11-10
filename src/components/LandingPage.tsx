'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-sans antialiased flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* ========================================================= */}
      {/* 1. TOP GLOBAL NAVIGATION                                  */}
      {/* ========================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f9f9f9]/85 backdrop-blur-md border-b border-[#e2e2e2] px-6 lg:px-12 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🎙️
            </span>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#111827] block leading-none">
                AIOralCheck
              </span>
              <span className="text-[9px] text-gray-500 font-medium tracking-wide">
                STUDIO v2.4 • IE104
              </span>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-600">
            <a href="#features" className="hover:text-black transition">
              Tính năng hiện tại
            </a>
            <a href="#roles" className="hover:text-black transition">
              Phân hệ người dùng
            </a>
            <a href="#workflow" className="hover:text-black transition">
              Quy trình lớp học
            </a>
            <a href="#status" className="hover:text-black transition">
              Kết nối dữ liệu
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-800 transition active:scale-95 shadow-2xs"
            >
              Đăng nhập
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-bold transition active:scale-95 shadow-sm"
            >
              Đăng ký Sinh viên
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION                                           */}
      {/* ========================================================= */}
      <main className="pt-28 pb-20 flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center flex flex-col items-center">
          {/* Version Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#e2e2e2] shadow-2xs mb-8">
            <span className="px-2 py-0.5 rounded-full bg-black text-white font-bold text-[9px] uppercase tracking-wider">
              MỚI
            </span>
            <span className="text-xs font-medium text-gray-700">
              Quản lý lớp học và bài tập trực tuyến
            </span>
            <span className="text-gray-400 text-xs">→</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-[#111827] tracking-tight leading-[1.08] max-w-4xl">
            Quản lý lớp học và bài tập trên một nền tảng
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
            Giảng viên tạo lớp và đăng bài tập; quản trị viên duyệt lớp; sinh viên tham gia lớp và xem nội dung bài tập đã công bố. Ghi âm, camera và AI hiện chưa được bật.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="px-7 py-3.5 rounded-full bg-black text-white hover:bg-gray-800 font-bold text-sm transition active:scale-95 shadow-md flex items-center gap-2"
            >
              <span>Bắt đầu trải nghiệm ngay</span>
              <span>→</span>
            </Link>

          </div>

          <div id="workflow" className="mt-14 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
            {[
              ['01', 'Tạo lớp học', 'Giảng viên gửi yêu cầu mở lớp và chờ quản trị viên phê duyệt.'],
              ['02', 'Tham gia lớp', 'Sinh viên nhập mã lớp đang hoạt động để tham gia.'],
              ['03', 'Đăng bài tập', 'Giảng viên đăng bài tập; sinh viên xem nội dung và hạn nộp.'],
            ].map(([step, title, description]) => (
              <article key={step} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <span className="font-mono text-xs font-bold text-indigo-700">{step}</span>
                <h2 className="mt-3 font-bold text-gray-900">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-gray-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. SECTION: 3 PHÂN HỆ VAI TRÒ TRỌNG TÂM                    */}
        {/* ========================================================= */}
        <section id="roles" className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              KIẾN TRÚC TOÀN DIỆN
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-3">
              Một nền tảng, trọn vẹn 3 phân hệ học thuật
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Các thao tác quản lý lớp và bài tập được giới hạn theo vai trò tài khoản.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Role Card 1: Sinh viên */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xl font-bold">
                  🎓
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                    PHÂN HỆ 01
                  </span>
                  <h3 className="text-lg font-bold text-[#111827] mt-1">Cổng Học tập Sinh viên</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Sinh viên tham gia lớp bằng mã, xem danh sách bài tập đã công bố và đọc nội dung đề bài.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Tham gia lớp bằng mã</li>
                  <li className="flex items-center gap-2">✓ Xem bài tập đã công bố</li>
                  <li className="flex items-center gap-2">• Nộp bài và xem điểm: đang hoàn thiện</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <Link
                  href="/student"
                  className="w-full py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 transition"
                >
                  Vào Cổng Sinh viên →
                </Link>
              </div>
            </div>

            {/* Role Card 2: Giảng viên */}
            <div className="rounded-3xl border-2 border-indigo-300 bg-white p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative ring-4 ring-indigo-50">
              <span className="absolute -top-3 right-6 bg-indigo-700 text-white text-[9px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
                TRỌNG TÂM
              </span>
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xl font-bold">
                  ⚖️
                </div>
                <div>
                  <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                    PHÂN HỆ 02
                  </span>
                  <h3 className="text-lg font-bold text-[#111827] mt-1">Studio Quản trị Giảng viên</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Tạo yêu cầu mở lớp, soạn bài tập gồm câu hỏi và hướng dẫn, sau đó công bố cho sinh viên.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Gửi yêu cầu mở lớp chờ duyệt</li>
                  <li className="flex items-center gap-2">✓ Soạn và công bố câu hỏi</li>
                  <li className="flex items-center gap-2">• Ghi âm và chấm AI: tạm hoãn</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6 space-y-2">
                <Link
                  href="/teacher/assignments/create"
                  className="w-full py-2.5 rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  Soạn bài tập →
                </Link>
                <Link
                  href="/teacher"
                  className="w-full py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center justify-center transition"
                >
                  Vào Dashboard Giảng viên
                </Link>
              </div>
            </div>

            {/* Role Card 3: Admin */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-800 border border-gray-300 flex items-center justify-center text-xl font-bold">
                  🛡️
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                    PHÂN HỆ 03
                  </span>
                  <h3 className="text-lg font-bold text-[#111827] mt-1">Trung tâm Điều hành Admin</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Phê duyệt hoặc từ chối yêu cầu mở lớp và theo dõi các lớp được tạo trong hệ thống.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Duyệt hoặc từ chối yêu cầu mở lớp</li>
                  <li className="flex items-center gap-2">✓ Gửi thông báo nội bộ</li>
                  <li className="flex items-center gap-2">• Quản lý tài khoản và AI: chưa bật</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <Link
                  href="/admin"
                  className="w-full py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 transition"
                >
                  Vào Cổng Quản trị viên →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. SECTION: CÁC TÍNH NĂNG HIỆN ĐANG CÓ                   */}
        {/* ========================================================= */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
                TÍNH NĂNG ĐANG HOẠT ĐỘNG
              </span>
              <h2 className="text-3xl font-black text-[#111827] leading-tight">
                Dữ liệu lớp học và bài tập được lưu an toàn
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Đăng nhập và phân quyền theo hồ sơ trong public.users. API kiểm tra vai trò trước khi cho phép tạo lớp, duyệt lớp, tham gia lớp hoặc soạn bài tập.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Xác thực người dùng</strong>
                    <span className="text-[11px] text-gray-500">Mỗi tài khoản có quyền truy cập phù hợp với vai trò.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Quản lý lớp học</strong>
                    <span className="text-[11px] text-gray-500">Yêu cầu mở lớp cần được quản trị viên duyệt; sinh viên tham gia bằng mã lớp.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Bài tập theo lớp</strong>
                    <span className="text-[11px] text-gray-500">Giảng viên soạn và công bố đề; sinh viên chỉ xem bài tập đã công bố.</span>
                  </div>
                </div>
              </div>
            </div>

            <div id="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">TẠM THỜI CHƯA BẬT</span>
              <h3 className="mt-3 text-xl font-bold text-gray-900">Các tính năng âm thanh và AI</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Ghi âm, camera, chuyển giọng nói thành văn bản, giám sát phòng thi và chấm điểm AI chưa được tích hợp vào luồng hiện tại.
              </p>
              <p className="mt-4 border-t border-amber-200 pt-4 text-xs leading-5 text-gray-600">
                Sinh viên hiện có thể xem đề bài và hạn nộp. Chức năng nộp bài và xem điểm sẽ được bổ sung sau.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 5. FOOTER TOÀN CỤC                                        */}
      {/* ========================================================= */}
      <footer className="w-full border-t border-gray-200 bg-white py-10 px-6 lg:px-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">
              🎙️
            </span>
            <span className="font-bold text-gray-800">AIOralCheck Platform</span>
            <span>•</span>
            <span>Đồ án môn IE104 - Thiết kế Giao diện Người dùng</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-black transition">
              Đăng nhập
            </Link>
            <Link href="/signup" className="hover:text-black transition">
              Đăng ký
            </Link>
            <Link href="/teacher" className="hover:text-black transition">
              Giảng viên
            </Link>
            <Link href="/student" className="hover:text-black transition">
              Sinh viên
            </Link>
          </div>

          <div className="text-[11px] text-gray-400">
            © 2024-2026 Nhóm 3 - Trường Đại học Công nghệ Thông tin (UIT - VNU-HCM)
          </div>
        </div>
      </footer>
    </div>
  );
}
