'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamRoom({ examId = 'CS102-MID-2024-03' }: { examId?: string }) {
  const router = useRouter();

  // State thời gian câu hỏi (01:14 = 74 giây)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(74);
  const [totalTimeLeft, setTotalTimeLeft] = useState(765); // 12:45 / 15:00
  const [currentQuestion, setCurrentQuestion] = useState(2);
  const [pauseCountLeft, setPauseCountLeft] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(true);

  // Hiệu ứng đếm ngược thời gian
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setTotalTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handlePause = () => {
    if (pauseCountLeft > 0 && !isPaused) {
      setIsPaused(true);
      setPauseCountLeft(0);
      setTimeout(() => {
        setIsPaused(false);
      }, 15000);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < 3) {
      setCurrentQuestion((prev) => prev + 1);
      setQuestionTimeLeft(120);
    } else {
      router.push(`/teacher/evaluations/${examId}`);
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[#f4f5f8] text-[#111827] font-sans text-xs antialiased flex flex-col justify-between relative"
    >
      {/* ========================================================= */}
      {/* 1. LỚP NỀN TRANG PHÒNG THI (LIGHT THEME EXAM DASHBOARD)    */}
      {/* ========================================================= */}

      {/* TOP HEADER SÁNG */}
      <header className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-semibold">CA THI VẤN ĐÁP CHÍNH THỨC</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                SINH VIÊN
              </span>
              <span className="text-[10px] text-gray-400 font-mono">{examId}</span>
            </div>
            <h1 className="text-sm font-black text-[#111827] tracking-tight">
              KỲ THI GIỮA KỲ: CS102 - CẤU TRÚC DỮ LIỆU &amp; GIẢI THUẬT
            </h1>
          </div>
        </div>

        {/* THÔNG SỐ GIÁM SÁT PROCTORING */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI PROCTORING: ĐANG GIÁM SÁT TRỰC TIẾP
          </span>

          <span className="hidden sm:inline-flex text-gray-600">
            🛡️ Rủi ro: <strong className="text-emerald-600 ml-1 font-mono">0.0%</strong>
          </span>

          <span className="hidden sm:inline-flex text-gray-600 font-mono">
            📶 STUN/TURN: <span className="text-gray-800 ml-1">18ms</span>
          </span>

          <div className="bg-black text-white px-3 py-1.5 rounded-xl flex items-center gap-2 font-mono shadow-sm">
            <span className="text-gray-400 text-[10px]">TỔNG THỜI GIAN</span>
            <span className="font-bold text-white text-xs">{formatTime(totalTimeLeft)} / 15:00</span>
          </div>
        </div>
      </header>

      {/* STEP PROGRESS BAR */}
      <div className="px-6 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 font-medium text-gray-600">
          <span>Tiến trình thi:</span>
          <span className="text-black font-bold">Câu hỏi {currentQuestion} / 3</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-700 text-[10px] font-semibold">
            <span className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center text-[9px]">
              ✓
            </span>
            Câu 1 (Đã nộp)
          </span>

          <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black text-white text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Câu {currentQuestion} (Đang trả lời)
          </span>

          <span className="text-gray-400 text-[10px]">Câu 3 (Chưa mở)</span>
        </div>
      </div>

      {/* MAIN LAYOUT 2 CỘT PHÒNG THI BÊN DƯỚI */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* CỘT TRÁI (8 COLS): ĐỀ BÀI VÀ THU ÂM NỀN */}
        <div className="lg:col-span-8 space-y-5">
          {/* Box Đề bài */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gray-900 text-white font-bold text-[10px]">
                TRỌNG SỐ 35%
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[10px]">
                PHÂN TÍCH THUẬT TOÁN
              </span>
            </div>

            <h2 className="text-base font-bold text-gray-900 leading-snug">
              CÂU HỎI 2: Phân tích độ phức tạp thời gian và cơ chế tái cân bằng của Heap Sort so với QuickSort khi dữ liệu đầu vào gần như đã sắp xếp.
            </h2>

            <div className="bg-[#f8f9ff] border border-indigo-100 rounded-xl p-3.5 text-[11px] text-gray-700 space-y-1">
              <span className="font-bold text-indigo-700">💡 Gợi ý cấu trúc trả lời chuẩn theo rubric AI:</span>
              <ul className="list-disc pl-5 space-y-0.5 text-gray-600 text-[10px]">
                <li>(1) Cơ chế Heapify: Mô tả thao tác Sift-down dựng Max/Min Heap O(N).</li>
                <li>(2) So sánh Best/Worst case: HeapSort O(N log N) vs QuickSort O(N²) khi chọn pivot không tối ưu.</li>
                <li>(3) Không gian bộ nhớ &amp; Tính ổn định: In-place O(1) &amp; Unstable.</li>
              </ul>
            </div>
          </div>

          {/* Box Ghi âm nền */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>ĐANG GHI ÂM TRẢ LỜI CỦA THÍ SINH...</span>
              <span className="text-gray-400 font-normal text-[10px] ml-auto">Hệ thống xử lý âm học AI đang thu nhận</span>
            </div>

            {/* Sóng âm nền */}
            <div className="h-12 flex items-center justify-center gap-1 bg-gray-50 rounded-xl border border-gray-200 px-3">
              {[20, 35, 15, 45, 28, 50, 32, 40, 24, 38, 18, 48, 30, 42, 22, 36, 16, 28, 12, 30, 18, 40].map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} className="w-1 bg-[#4f46e5] rounded-full" />
              ))}
            </div>

            {/* STT Text Preview nền */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[11px] text-gray-700 leading-relaxed">
              &quot;Thưa thầy cô và hệ thống AI, đối với mảng gần như đã sắp xếp, QuickSort nếu chọn pivot ở phần tử đầu hoặc cuối sẽ dễ rơi vào Worst Case O(N²)...&quot;
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button type="button" className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white font-bold text-xs">
                  ⏸ Tạm dừng suy nghĩ (15s)
                </button>
                <button type="button" className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white font-bold text-xs">
                  🔄 Nghe lại đoạn vừa nói
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFocusModal(true)}
                className="px-5 py-2 rounded-xl bg-black text-white font-bold text-xs shadow-md"
              >
                Mở khung trả lời tập trung 🎙️
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4 COLS): WEBCAM AI TRỰC TIẾP & BAREM ĐIỂM */}
        <div className="lg:col-span-4 space-y-5">
          {/* Box Camera Giám sát */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <span>📹</span> CAMERA TRỰC TIẾP
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px]">
                CHUẨN QUY CHẾ
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-gray-900 h-44 flex items-center justify-center border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600"
                alt="Webcam Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-8 inset-y-4 border-2 border-[#10b981] rounded pointer-events-none flex flex-col justify-between p-1.5">
                <span className="text-[8px] text-[#10b981] font-mono bg-black/60 px-1 rounded self-start">
                  GAZE: 0.02° (CENTER)
                </span>
                <span className="text-[9px] text-white font-bold bg-[#10b981] px-1.5 py-0.2 rounded self-center shadow">
                  Lê Thị Bình (21520104)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px] text-gray-600">
              <div className="flex justify-between">
                <span>Số người trong khung hình:</span>
                <strong className="text-gray-900">1 người (99.6%)</strong>
              </div>
              <div className="flex justify-between">
                <span>Hướng nhìn (Gaze):</span>
                <strong className="text-emerald-600 font-bold">Chính diện 98%</strong>
              </div>
              <div className="flex justify-between">
                <span>Âm thanh môi trường:</span>
                <strong className="text-emerald-600 font-bold">Không có tạp âm</strong>
              </div>
            </div>
          </div>

          {/* Box Barem 100 điểm */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2.5 text-[11px]">
            <div className="flex justify-between font-bold text-gray-900 pb-2 border-b border-gray-100">
              <span>Barem điểm câu 2</span>
              <span className="text-indigo-600 font-mono">100 ĐIỂM</span>
            </div>
            <div className="space-y-1.5 text-gray-600 text-[10px]">
              <div className="flex justify-between">
                <span>Khái niệm &amp; Cơ chế Heapify:</span>
                <span className="font-bold">40%</span>
              </div>
              <div className="flex justify-between">
                <span>Phân tích Best/Worst Case O(N log N):</span>
                <span className="font-bold">30%</span>
              </div>
              <div className="flex justify-between">
                <span>Độ lưu loát &amp; Phát âm thuật ngữ:</span>
                <span className="font-bold">30%</span>
              </div>
            </div>
          </div>

          {/* Box Giám sát AI Real-time */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2 text-[10px]">
            <div className="flex justify-between font-bold text-gray-900">
              <span>GIÁM SÁT AI</span>
              <span className="text-emerald-600 font-mono font-bold">● REAL-TIME</span>
            </div>
            <p className="text-gray-500 text-[9px]">
              AI đang trích xuất thực thể câu trả lời Câu 2 (CS102-Q2).
            </p>
            <div className="p-2 bg-gray-50 rounded-lg font-mono text-[9px] text-gray-600 border border-gray-100">
              Phát hiện từ khóa: &quot;Min-Heap&quot;, &quot;Sift-down&quot;, &quot;O(N log N)&quot;.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LỚP POPUP TRẢ LỜI TẬP TRUNG (FOCUS MODAL NHƯ TRONG ẢNH) */}
      {/* ========================================================= */}
      {showFocusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white text-[#111827] rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Header Modal */}
            <div className="bg-[#fafafa] px-5 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold text-[9px]">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  {isPaused ? 'TẠM DỪNG (15s)' : 'ĐANG GHI ÂM TRỰC TIẾP'}
                </span>

                <div>
                  <span className="font-bold text-xs text-[#111827]">
                    CÂU HỎI {currentQuestion} / 3 - Heap Sort vs QuickSort
                  </span>
                  <span className="block text-[9px] text-gray-400 font-mono">
                    48kHz FLAC • Không nén • Độ trễ 12ms
                  </span>
                </div>
              </div>

              {/* Bộ đếm thời gian */}
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                <span className="text-red-500 text-xs">⌛</span>
                <div>
                  <span className="block text-[7px] font-bold text-red-600 uppercase tracking-wider">
                    THỜI GIAN CÒN LẠI
                  </span>
                  <span className="font-mono font-bold text-xs text-red-600">
                    {formatTime(questionTimeLeft)} <span className="text-gray-400 text-[9px]">/ 02:00</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thân Modal */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Đề bài */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.2 rounded-full bg-gray-900 text-white font-bold text-[9px]">
                      TRỌNG SỐ: 35%
                    </span>
                    <span className="px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[9px]">
                      PHÂN TÍCH THUẬT TOÁN
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-400">❓ Đề thi chính thức</span>
                </div>

                <h3 className="text-sm font-black text-[#111827] leading-snug">
                  CÂU HỎI {currentQuestion}: Phân tích độ phức tạp thời gian và cơ chế tái cân bằng của Heap Sort so với QuickSort khi dữ liệu đầu vào gần như đã sắp xếp.
                </h3>

                {/* Rubric gợi ý */}
                <div className="bg-[#f8f9ff] border border-indigo-100 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                    <span>💡</span> Ý CHÍNH TRẢ LỜI CHUẨN THEO RUBRIC AI:
                  </span>
                  <div className="space-y-1 text-[9px] text-gray-700">
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <strong>1. Cơ chế Heapify</strong> (Sift-down O(N) dựng Max/Min Heap)
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <strong>2. So sánh Worst/Best case</strong> (HeapSort O(N log N) vs QuickSort O(N²))
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                      <strong>3. Bộ nhớ phụ trợ</strong> (In-place O(1) &amp; tính Unstable)
                    </div>
                  </div>
                </div>
              </div>

              {/* Sóng âm thanh */}
              <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-gray-800">
                    📊 Dải sóng âm học giọng nói (Dynamic Acoustic Waveform)
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold text-[8px]">
                    ● MIC ON
                  </span>
                </div>

                <div className="h-10 flex items-center justify-center gap-1 bg-white rounded-lg border border-gray-200 px-2">
                  {[12, 28, 16, 40, 24, 46, 30, 36, 18, 32, 14, 38, 26, 34, 18, 28, 14, 24, 12, 32, 22, 36, 16, 26, 14, 10, 8, 8].map(
                    (h, i) => (
                      <span
                        key={i}
                        style={{ height: `${isPaused ? 6 : h}px` }}
                        className={`w-0.5 sm:w-1 rounded-full transition-all duration-200 ${
                          i % 3 === 0 ? 'bg-[#4f46e5]' : i % 2 === 0 ? 'bg-[#818cf8]' : 'bg-[#111827]'
                        }`}
                      />
                    )
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
                  <div className="bg-white border border-gray-200 rounded-lg p-1.5">
                    <span className="text-gray-400">Cường độ âm:</span>{' '}
                    <strong className="text-gray-800 font-mono">-15.8 dBFS</strong>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-1.5">
                    <span className="text-gray-400">Pitch Frequency:</span>{' '}
                    <strong className="text-gray-800 font-mono">184 Hz</strong>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-1.5">
                    <span className="text-gray-400">Tốc độ nói:</span>{' '}
                    <strong className="text-gray-800 font-mono">132 WPM</strong>
                  </div>
                </div>
              </div>

              {/* Live STT Preview */}
              <div className="bg-[#f9fafb] border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-[10px]">
                    💬 NHẬN DIỆN GIỌNG NÓI TRỰC TIẾP (LIVE STT PREVIEW)
                  </span>
                  <span className="text-[8px] text-emerald-600 font-bold font-mono">● Độ trễ ASR: 120ms</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-[10px] leading-relaxed text-gray-700">
                  &quot;Thưa thầy cô và hệ thống AI, đối với mảng gần như đã sắp xếp,{' '}
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-0.5 rounded">QuickSort</span> nếu chọn pivot ở phần tử đầu hoặc cuối sẽ dễ rơi vào{' '}
                  <span className="font-bold text-red-700 bg-red-50 px-0.5 rounded">Worst Case O(N²)</span> do phân hoạch bị lệch cực đại. Ngược lại, thuật toán{' '}
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-0.5 rounded">Heap Sort</span> nhờ thao tác{' '}
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-0.5 rounded">Heapify</span> (cụ thể là Sift-down) vẫn luôn đảm bảo xây dựng{' '}
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-0.5 rounded">Binary Heap</span> trong thời gian O(N)...&quot;
                  <span className="inline-block w-1 h-3 bg-indigo-600 ml-1 animate-pulse" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-gray-500 pt-1">
                  <span>👤 Khuôn mặt: <strong className="text-emerald-600">99.6% chính diện</strong></span>
                  <span>🍃 Môi trường: <strong className="text-emerald-600">Yên tĩnh tuyệt đối</strong></span>
                  <span>🎙️ Voiceprint: <strong className="text-indigo-600">Match 99.4%</strong></span>
                </div>
              </div>

              {/* Nút điều khiển Modal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={pauseCountLeft === 0 || isPaused}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 font-bold text-[11px] disabled:opacity-40"
                  >
                    ⏸ Tạm dừng (15s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionTimeLeft(120)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 font-bold text-[11px]"
                  >
                    🔄 Bỏ &amp; Thu âm lại
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowFocusModal(false)}
                    className="px-3 py-2 rounded-xl border border-gray-300 bg-white font-bold text-[11px] text-gray-600 hover:text-black"
                    title="Thu nhỏ để xem camera và barem"
                  >
                    Thu nhỏ 👁️
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
                  >
                    <span>{currentQuestion < 3 ? 'Câu hỏi tiếp theo' : 'Hoàn thành ca thi'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER SÁNG BÊN DƯỚI */}
      <footer className="px-6 py-2.5 bg-white border-t border-gray-200 text-[10px] text-gray-600 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span>🎙️</span> Microphone: <strong className="text-gray-900">Rode NT-USB Mini (Chống ồn AI Bật)</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="hidden sm:inline">
            Tốc độ nói: <strong className="text-emerald-700">132 WPM (Chuẩn)</strong>
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="hidden sm:inline">
            Độ ổn định cao độ (Pitch): <strong className="text-emerald-700">184 Hz (Ổn định)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Hỗ trợ kỹ thuật giám thị:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-700 font-mono text-[9px]">
            Phím F1
          </kbd>
        </div>
      </footer>
    </div>
  );
}