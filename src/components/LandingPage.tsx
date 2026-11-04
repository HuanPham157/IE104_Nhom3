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
              Công nghệ Âm học AI
            </a>
            <a href="#roles" className="hover:text-black transition">
              Phân hệ 3 Vai trò
            </a>
            <a href="#rubric" className="hover:text-black transition">
              Barem LLM Kép
            </a>
            <a href="#security" className="hover:text-black transition">
              Chuẩn Bảo mật &amp; Proctoring
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
              AIOralCheck 2.0: Mô hình Khảo thí Giọng nói Chuẩn Đại học
            </span>
            <span className="text-gray-400 text-xs">→</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-[#111827] tracking-tight leading-[1.08] max-w-4xl">
            Khảo thí Vấn đáp Âm học &amp; Đánh giá Tự động bằng AI
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
            Hệ thống tích hợp giám sát phòng thi AI Proctoring đa tầng, nhận diện giọng nói kỹ thuật song ngữ 48kHz và chấm điểm tức thì theo Barem Rubric của Hội đồng Khoa.
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

            <Link
              href="/student/exam/CS102-MID-2024-03"
              className="px-6 py-3.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm transition active:scale-95 shadow-2xs flex items-center gap-2"
            >
              <span>🎙️ Vào phòng thi mẫu (Audio Lab)</span>
            </Link>
          </div>

          {/* Interactive Hero Demo Card */}
          <div className="mt-14 w-full max-w-4xl rounded-3xl border border-gray-200 bg-white p-3 sm:p-5 shadow-xl text-left">
            <div className="rounded-2xl border border-gray-200 bg-[#fbfbfb] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-gray-900">
                    BẢN GHI ÂM KHẢO THÍ CHÍNH THỨC • CS102 (HEAP SORT VS QUICKSORT)
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                  ✓ FLAC 48kHz Không nén
                </span>
              </div>

              {/* Sóng âm giả lập */}
              <div className="h-16 flex items-center justify-center gap-1 sm:gap-1.5 px-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {[14, 28, 45, 20, 36, 52, 24, 40, 18, 48, 30, 42, 22, 35, 16, 28, 50, 32, 22, 44, 38, 20, 32, 16, 42, 26, 48, 18, 34, 52, 28, 38, 14].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}px` }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      i < 18 ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Thông số Realtime Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-[10px] font-mono">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block">ĐIỂM AI ĐỀ XUẤT</span>
                  <strong className="text-xs text-indigo-700 font-bold">8.5 / 10.0</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block">TỐC ĐỘ NÓI (TEMPO)</span>
                  <strong className="text-xs text-gray-800 font-bold">132 WPM (Chuẩn)</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block">AI PROCTORING GAZE</span>
                  <strong className="text-xs text-emerald-600 font-bold">0.02° (Chính diện)</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block">ĐỘ TRỄ ASR</span>
                  <strong className="text-xs text-gray-800 font-bold">12ms (Realtime)</strong>
                </div>
              </div>
            </div>
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
              Khép kín vòng đời khảo thí từ lúc Admin cấp phép, Giảng viên ra đề, đến khi Sinh viên làm bài và thẩm định kết quả.
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
                  Trang chủ tổng quan tiến độ, phòng thi trực tiếp với micro chống ồn AI, hiển thị STT transcript tức thì và xem điểm minh bạch kèm nhận xét.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Gia nhập lớp học bằng mã hoặc QR</li>
                  <li className="flex items-center gap-2">✓ Phòng kiểm tra thiết bị &amp; Cam kết quy chế</li>
                  <li className="flex items-center gap-2">✓ Xem Barem Rubric &amp; Feedback giảng viên</li>
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
                  Soạn đề thi &amp; cấu hình tiêu chí Barem LLM, nghe lại bản thu âm của sinh viên, xem phân tích lỗi sai và can thiệp điều chỉnh điểm số.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Question Builder &amp; Thẻ từ khóa Entity</li>
                  <li className="flex items-center gap-2">✓ Trình phát âm thanh điều chỉnh tốc độ</li>
                  <li className="flex items-center gap-2">✓ Dual-LLM Scorecard &amp; Ký số công bố</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6 space-y-2">
                <Link
                  href="/teacher/assignments/create"
                  className="w-full py-2.5 rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  Soạn đề thi (Question Builder) →
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
                  Phê duyệt lớp học mới, xét duyệt học hàm/học vị giảng viên (Approve/Reject kèm lý do), kiểm soát hạn ngạch token AI và nhật ký Audit.
                </p>
                <ul className="space-y-1.5 text-[11px] text-gray-600">
                  <li className="flex items-center gap-2">✓ Duyệt lớp &amp; Xác nhận mã học phần</li>
                  <li className="flex items-center gap-2">✓ Quản lý danh sách sinh viên / giảng viên</li>
                  <li className="flex items-center gap-2">✓ Giám sát hạ tầng suy luận âm thanh</li>
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <Link
                  href="/teacher"
                  onClick={() => alert('Cổng Admin Quản trị đang kích hoạt tài khoản quản trị viên.')}
                  className="w-full py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 flex items-center justify-center gap-2 transition"
                >
                  Vào Cổng Quản trị viên →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. SECTION: TÍNH NĂNG CÔNG NGHỆ ÂM HỌC ĐỘT PHÁ           */}
        {/* ========================================================= */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
                CÔNG NGHỆ LÕI
              </span>
              <h2 className="text-3xl font-black text-[#111827] leading-tight">
                Xử lý âm thanh song ngữ &amp; Trích xuất ý niệm chính xác
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Sinh viên Việt Nam ngành Công nghệ Thông tin thường phát âm tiếng Việt đan xen thuật ngữ kỹ thuật tiếng Anh (ví dụ: *Heapify, Sift-down, Idempotency*). AIOralCheck được huấn luyện để nhận diện mượt mà và đối chiếu đúng barem khoa học.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Lọc ồn &amp; Chống tạp âm AI (Noise Suppression 94.8%)</strong>
                    <span className="text-[11px] text-gray-500">Loại bỏ tạp âm môi trường và tiếng ồn xung quanh phòng thi.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Mô hình Đánh giá LLM Kép (Dual-LLM Cross-check)</strong>
                    <span className="text-[11px] text-gray-500">2 mô hình chạy song song để so khớp rubric, phát hiện hiểu sai và đề xuất điểm khách quan.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-black text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-xs text-gray-900 block">Giám sát AI Gaze &amp; Quy chế Phòng thi</strong>
                    <span className="text-[11px] text-gray-500">Phát hiện góc nhìn lệch, người thứ hai trong phòng và bảo mật toàn vẹn ca thi.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Box */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg space-y-4">
              <div className="p-4 rounded-2xl bg-[#f8f9ff] border border-indigo-100 space-y-3">
                <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1.5">
                  <span>💡</span> PHÂN TÍCH SPEECH-TO-TEXT REALTIME
                </span>
                <p className="text-xs text-gray-800 italic leading-relaxed">
                  &quot;Đối với mảng gần như đã sắp xếp, <span className="bg-amber-100 text-amber-900 font-bold px-1 rounded">QuickSort</span> rơi vào Worst Case O(N²) do pivot lệch. Ngược lại, <span className="bg-indigo-100 text-indigo-900 font-bold px-1 rounded">Heap Sort</span> nhờ thao tác <span className="bg-indigo-100 text-indigo-900 font-bold px-1 rounded">Heapify</span> vẫn duy trì chặt chẽ O(N log N)...&quot;
                </p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-indigo-100/60 text-[9px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓ Ý đúng: Heapify</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓ Worst-case O(N²)</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">✓ Độ trôi chảy: 132 WPM</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="font-semibold text-gray-700">Quyền thẩm định cuối cùng:</span>
                <span className="font-bold text-black">Giảng viên phụ trách môn</span>
              </div>
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
