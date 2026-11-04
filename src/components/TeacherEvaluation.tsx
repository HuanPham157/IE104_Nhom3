'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function TeacherEvaluation({ examId = 'CS102-MID-2024-03' }: { examId?: string }) {
  // State điều khiển điểm và audio
  const [playbackSpeed, setPlaybackSpeed] = useState<'1.0x' | '1.2x' | '1.5x'>('1.0x');
  const [isPlaying, setIsPlaying] = useState(false);
  const [teacherScore, setTeacherScore] = useState<number>(9.0);
  const [feedback, setFeedback] = useState<string>(
    'Em giải thích mạch lạc, tự tin. Chú ý đọc lại giáo trình chương 3 về trường hợp suy biến khi chọn pivot đầu mảng để không nhầm lẫn khi thi cuối kỳ. Đã cộng 0.5 điểm khuyến khích phong thái phản xạ.'
  );
  const [syncCanvas, setSyncCanvas] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[#f4f5f8] text-[#111827] font-sans text-xs antialiased flex flex-col justify-between"
    >
      <div className="flex flex-1">
        {/* ========================================================= */}
        {/* 1. SIDEBAR GIẢNG VIÊN (BÊN TRÁI)                          */}
        {/* ========================================================= */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col justify-between shrink-0 hidden lg:flex sticky top-0 h-screen">
          <div className="space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
                🎙️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-tight text-gray-900">AIOralCheck</span>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                    STUDIO
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">Hệ thống khảo thí âm học AI</span>
              </div>
            </div>

            {/* Nút hành động nổi bật */}
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              <span>🎙️</span>
              <span>Chấm bài thi miệng</span>
            </button>

            {/* Menu điều hướng */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                ĐIỀU HƯỚNG CHÍNH
              </span>
              <nav className="space-y-0.5 pt-1 text-[11px] font-medium text-gray-600">
                <Link href="/teacher" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>📊</span> Tổng quan
                </Link>
                <Link href="/teacher/classes" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>👥</span> Lớp của tôi
                </Link>
                <Link href="/tasks" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>📝</span> Bài tập oral
                </Link>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  <span className="flex items-center gap-3">
                    <span>💡</span> Đánh giá AI &amp; Chấm điểm
                  </span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                </div>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>🎙️</span> Phòng thu âm AI
                </a>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100">
                  <span>🏆</span> Lịch sử &amp; Bảng xếp hạng
                </a>
              </nav>
            </div>
          </div>

          {/* User profile & Settings */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <a href="#" className="flex items-center gap-3 px-3 py-1.5 text-gray-600 hover:text-black text-[11px]">
              <span>⚙️</span> Cài đặt
            </a>

            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                VN
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-gray-900 truncate text-[11px]">TS. Trần Văn Nam</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold text-[8px]">
                  GIẢNG VIÊN
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span className="flex items-center gap-1">
                <span>❓</span> Trợ giúp &amp; Hướng dẫn
              </span>
              <span className="text-emerald-600 font-bold">● Sẵn sàng</span>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 2. KHÔNG GIAN LÀM VIỆC CHÍNH (MAIN WORKSPACE)             */}
        {/* ========================================================= */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* TOPBAR NGỮ CẢNH */}
          <header className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-20 shadow-xs gap-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span>Khoa CNTT</span>
              <span>/</span>
              <span>CS201: Cấu trúc Dữ liệu &amp; Giải thuật</span>
              <span>/</span>
              <span className="font-bold text-gray-900">Kỳ thi Đánh giá Vấn đáp Đợt 2</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                QuickSort &amp; Đệ quy
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                AI HOÀN TẤT TRÍCH XUẤT (STT 99.4%)
              </span>

              <span className="text-[10px] text-gray-400">Thời gian nộp: 10:42 SA, 24/10/2026</span>

              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-[11px] flex items-center gap-1.5"
              >
                <span>🔄</span> Chuyển vai trò
              </button>

              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-black text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-gray-800"
              >
                <span>⚡</span> Bắt đầu đánh giá
              </button>
            </div>
          </header>

          {/* MAIN 2 CỘT CHẤM ĐIỂM (BENTO LAYOUT) */}
          <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-24">
            {/* ---------------------------------------------------- */}
            {/* CỘT TRÁI (5 COLS): AUDIO PLAYER & SPEECH-TO-TEXT     */}
            {/* ---------------------------------------------------- */}
            <div className="xl:col-span-5 space-y-6">
              {/* CARD 1: TRÌNH PHÁT BẢN GHI ÂM (AUDIO PLAYER) */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                      🎙️
                    </div>
                    <div>
                      <h2 className="font-bold text-xs text-gray-900">Bản ghi âm bài trả lời vấn đáp</h2>
                      <p className="text-[10px] text-gray-500">
                        Sinh viên: <strong className="text-gray-900">Trần Minh Đức</strong> • MSSV: <strong className="font-mono">20210345</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400">
                    <span className="px-2 py-0.5 rounded bg-gray-100">48kHz / 2.1MB</span>
                    <span className="px-2 py-0.5 rounded bg-gray-100">Lossless AAC</span>
                  </div>
                </div>

                {/* Sóng âm thanh phát lại */}
                <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      Phân đoạn phân tích tần số giọng nói
                    </span>
                    <span className="font-mono font-bold text-gray-900">00:48 / 01:45</span>
                  </div>

                  {/* Thanh sóng âm thanh */}
                  <div className="h-12 flex items-center justify-center gap-1 bg-white rounded-lg border border-gray-200 px-3">
                    {[12, 28, 16, 42, 24, 48, 32, 38, 20, 34, 14, 40, 26, 36, 18, 30, 14, 26, 12, 32, 22, 36, 16, 26, 14, 20, 10, 8].map(
                      (h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}px` }}
                          className={`w-1 rounded-full transition-all ${
                            i < 14 ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>

                {/* Bộ điều khiển Playback */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-xs"
                      title="Lùi 10s"
                    >
                      ↺
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-xl bg-black text-white hover:bg-gray-800 flex items-center justify-center text-sm shadow-md"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-xs"
                      title="Tiến 10s"
                    >
                      ↻
                    </button>
                  </div>

                  {/* Tốc độ đọc */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['1.0x', '1.2x', '1.5x'] as const).map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          playbackSpeed === speed ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
                        }`}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                    <span>🎚️ Pitch: <strong>142Hz</strong></span>
                    <span>🔊</span>
                  </div>
                </div>
              </section>

              {/* CARD 2: BẢN PHIÊN ÂM GIỌNG NÓI (SPEECH-TO-TEXT) */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="font-bold text-xs text-gray-900 flex items-center gap-2">
                    <span>💬</span> Bản phiên âm giọng nói (Speech-to-Text)
                  </h2>

                  {/* Chú giải highlight */}
                  <div className="flex items-center gap-2 text-[9px] font-semibold">
                    <span className="text-gray-400">Chú giải:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Từ vựng chuẩn
                    </span>
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                      Hiểu sai / Áp dụng
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5 text-[11px] leading-relaxed">
                  {/* Block Giảng viên / Đề bài */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-gray-700">Giảng viên / Đề bài:</span>
                      <span className="text-gray-400 font-mono">00:00 - 00:08</span>
                    </div>
                    <p className="text-gray-600 italic text-[10px]">
                      &quot;Em hãy giải thích cơ chế hoạt động của thuật toán sắp xếp nhanh QuickSort, độ phức tạp thuật toán trong trường hợp tốt nhất và xấu nhất?&quot;
                    </p>
                  </div>

                  {/* Block Sinh viên trả lời có Highlight */}
                  <div className="p-3.5 bg-white rounded-xl border border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        Sinh viên: Trần Minh Đức
                      </span>
                      <span className="text-gray-400 font-mono">00:09 - 01:45</span>
                    </div>

                    <p className="text-gray-800">
                      &quot;Thưa thầy, thuật toán <strong className="text-indigo-700">QuickSort</strong> hoạt động dựa trên nguyên lý{' '}
                      <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                        chia để trị (Divide and Conquer)
                      </span>. Đầu tiên, ta chọn một phần tử làm{' '}
                      <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                        chốt (pivot)
                      </span>, sau đó phân hoạch mảng thành hai nửa: nửa bên trái gồm các phần tử nhỏ hơn chốt, và nửa bên phải gồm các phần tử lớn hơn chốt.&quot;
                    </p>

                    <p className="text-gray-800">
                      &quot;Sau đó, ta tiến hành gọi{' '}
                      <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                        đệ quy
                      </span>{' '}
                      cho hai mảng con đó cho đến khi kích thước mảng con bằng 1. Về độ phức tạp: Trong trường hợp tốt nhất, khi điểm chốt luôn chia mảng thành hai phần cân bằng nhau, ta có độ phức tạp thời gian là{' '}
                      <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300 font-mono">
                        O(n log n)
                      </span>.&quot;
                    </p>

                    {/* Hộp cảnh báo hiểu sai */}
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[10px] text-red-800 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        <span>⚠️</span> Điểm phát hiện hiểu sai khái niệm (01:12):
                      </div>
                      <p className="pl-4 text-red-700">
                        Thí sinh phát biểu nhầm rằng trường hợp xấu nhất xảy ra khi mảng hoàn toàn ngẫu nhiên.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ---------------------------------------------------- */}
            {/* CỘT PHẢI (7 COLS): PHIẾU ĐIỂM AI & BẢNG CHẤM ĐIỂM    */}
            {/* ---------------------------------------------------- */}
            <div className="xl:col-span-7 space-y-6">
              {/* CARD 1: ĐÁNH GIÁ TỔNG HỢP BẰNG LLM KÉP */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      ĐÁNH GIÁ TỔNG HỢP BẰNG LLM KÉP
                    </span>
                    <h2 className="text-sm font-black text-gray-900 mt-0.5">Phiếu điểm AI Đề xuất</h2>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black text-gray-900 font-mono">8.5</span>
                    <span className="text-xs text-gray-400 font-mono"> / 10.0</span>
                  </div>
                </div>

                {/* 3 Thanh tiến trình Barem */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span>Đúng khái niệm</span>
                      <span className="text-emerald-700 font-mono">90%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '90%' }} />
                    </div>
                  </div>

                  <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span>Tính mạch lạc</span>
                      <span className="text-indigo-700 font-mono">80%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>

                  <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span>Phân tích lỗi</span>
                      <span className="text-blue-700 font-mono">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>

                {/* Chỉ số phụ */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-gray-600 pt-1">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    ⏱️ Tốc độ nói: <strong className="text-gray-900 font-mono">128 từ/phút</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    ⏸️ Thời gian ngập ngừng: <strong className="text-gray-900 font-mono">3.2s</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    🎯 Độ tự tin khẩu ngữ: <strong className="text-emerald-600 font-mono">88%</strong>
                  </div>
                </div>
              </section>

              {/* CARD 2: PHÂN TÍCH CHI TIẾT TỪ MÔ HÌNH LLM */}
              <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3.5">
                <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
                  <span>📑</span> Phân tích Chi tiết từ Mô hình LLM
                </h3>

                {/* 1. Điểm mạnh */}
                <div className="p-3.5 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-1.5">
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <span>✓</span> Ý đúng / Điểm mạnh (Strengths):
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-emerald-950 text-[10px] leading-relaxed">
                    <li>Nêu rất chuẩn xác nguyên lý cốt lõi <strong>chia để trị (Divide and Conquer)</strong> và cơ chế phân hoạch theo chốt.</li>
                    <li>Chỉ rõ được độ phức tạp thời gian trường hợp tốt nhất đạt <strong>O(n log n)</strong> khi chốt chia đôi mảng đều đặn.</li>
                    <li>Phát âm thuật ngữ chuyên ngành rõ ràng, cấu trúc trình bày gãy gọn.</li>
                  </ul>
                </div>

                {/* 2. Ý sai */}
                <div className="p-3.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] space-y-1.5">
                  <span className="font-bold text-red-800 flex items-center gap-1.5">
                    <span>✕</span> Ý sai / Hiểu nhầm (Misconceptions):
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-red-950 text-[10px] leading-relaxed">
                    <li><strong>Sai lệch nghiêm trọng:</strong> Thí sinh phát biểu trường hợp xấu nhất xảy ra khi <em>&quot;mảng ngẫu nhiên hoàn toàn&quot;</em>.</li>
                    <li><strong>Thực tế:</strong> Trường hợp xấu nhất O(n²) xuất hiện khi mảng đã sắp xếp sẵn (hoặc nghịch đảo) và thuật toán luôn chọn pivot là phần tử đầu hoặc cuối.</li>
                  </ul>
                </div>

                {/* 3. Ý còn thiếu */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <span>❓</span> Ý còn thiếu (Missing Points):
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700 text-[10px] leading-relaxed">
                    <li>Chưa giải thích được giải pháp kỹ thuật nâng cao: <strong>Randomized Pivot</strong> hoặc kỹ thuật <strong>Median-of-three</strong>.</li>
                    <li>Chưa đề cập tới độ phức tạp không gian ngăn xếp đệ quy: O(log n) vs O(n).</li>
                  </ul>
                </div>

                {/* 4. Actionable Feedback */}
                <div className="p-3.5 rounded-xl bg-[#1e1b4b] text-white space-y-1">
                  <span className="font-bold text-[#c7d2fe] flex items-center gap-1.5 text-[10px]">
                    <span>💡</span> Nhận xét tổng quan của AI (Actionable Feedback):
                  </span>
                  <p className="text-[10px] leading-relaxed text-indigo-100 italic">
                    &quot;Thí sinh nắm vững bản chất đệ quy nhưng cần ôn lại phần phân tích toán học về cây đệ quy bị lệch khi chọn pivot cực trị. Cần bổ sung ví dụ thực tế về kỹ thuật chọn trung vị 3 phần tử để đạt điểm xuất sắc.&quot;
                  </p>
                </div>
              </section>

              {/* CARD 3: BẢNG ĐIỀU KHIỂN GIẢNG VIÊN (OVERRIDE & FEEDBACK) */}
              <section className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="font-black text-xs text-gray-900 flex items-center gap-2">
                      <span>⚖️</span> Bảng điều khiển Giảng viên (Override &amp; Feedback)
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Quyền thẩm định và công bố điểm chính thức của Giảng viên
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[9px]">
                    GIẢNG VIÊN THẨM ĐỊNH
                  </span>
                </div>

                {/* 2 Ô nhập điểm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="block text-[10px] text-gray-500 mb-1">Điểm AI gợi ý</span>
                    <span className="text-xl font-bold font-mono text-gray-900">8.5</span>
                    <span className="text-xs text-gray-400 font-mono"> / 10.0</span>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1">
                    <label className="block text-[10px] font-bold text-indigo-900" htmlFor="teacher-score">
                      Điều chỉnh điểm số cuối cùng (Tối đa: 10.0)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="teacher-score"
                        type="number"
                        step="0.25"
                        min="0"
                        max="10"
                        value={teacherScore}
                        onChange={(e) => setTeacherScore(parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 rounded-lg border border-indigo-300 bg-white font-mono font-black text-base text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                        ↑ +0.5 điểm: Giảng viên cộng thêm do phong thái trả lời lưu loát
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lời phê của giảng viên */}
                <div className="space-y-1.5">
                  <label htmlFor="teacher-feedback" className="block text-[11px] font-bold text-gray-800">
                    Lời phê &amp; Nhận xét riêng của giảng viên (Gửi cho sinh viên):
                  </label>
                  <textarea
                    id="teacher-feedback"
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-300 bg-white text-[11px] leading-relaxed outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Nút hành động */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={syncCanvas}
                      onChange={(e) => setSyncCanvas(e.target.checked)}
                      className="rounded text-black focus:ring-black cursor-pointer"
                    />
                    <span>Tự động đồng bộ vào Sổ điểm Canvas/Moodle</span>
                  </label>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-bold text-xs"
                    >
                      Lưu chỉnh sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublished(true)}
                      className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <span>🚀</span>
                      <span>{isPublished ? 'Đã công bố kết quả' : 'Công bố kết quả (Publish)'}</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. FOOTER CÔNG CỤ CHẤM BÀI (BOTTOM FIXED BAR)             */}
          {/* ========================================================= */}
          <footer className="fixed bottom-0 inset-x-0 lg:left-64 z-30 bg-white border-t border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-600 font-medium">
                👤 <strong>Trần Minh Đức</strong> • 20210345 | Bài tập: <em>QuickSort &amp; Đệ quy</em>
              </span>

              <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Sinh viên trước">
                  ⏮
                </button>
                <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" title="Sinh viên kế tiếp">
                  ⏭
                </button>
              </div>
            </div>

            {/* Tiến độ chấm bài của lớp */}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-gray-500">
                Tiến độ chấm lớp: <strong className="text-gray-900 font-mono">24 / 45 sinh viên</strong>
              </span>
              <div className="w-28 bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full rounded-full" style={{ width: '53%' }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-[11px] flex items-center gap-1"
              >
                <span>🕒</span> Lịch sử chấm
              </button>

              <button
                type="button"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-indigo-700"
              >
                <span>📥</span> Xuất Báo cáo PDF
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}