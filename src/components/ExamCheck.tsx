'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExamCheck({ examId = 'CS102-MID-2024-03' }: { examId?: string }) {
  const router = useRouter();

  // State đếm ngược thời gian hiệu chuẩn (5 phút)
  const [timeLeft, setTimeLeft] = useState(298); // 04:58
  const [micVolume, setMicVolume] = useState(65);
  const [cameraActive, setCameraActive] = useState(true);
  const [micTested, setMicTested] = useState(false);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(true);

  // Hiệu ứng đếm ngược thời gian
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Thử giọng đọc mẫu 5s
  const handleTestMic = () => {
    setIsRecordingSample(true);
    setTimeout(() => {
      setIsRecordingSample(false);
      setMicTested(true);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans text-xs pb-12 antialiased">
      {/* 1. TOP BREADCRUMB & NETWORK STATUS */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#e5e7eb] bg-white text-[11px] text-[#6b7280]">
        <div className="flex items-center gap-2">
          <Link href="/student" className="hover:text-black">Sinh viên</Link>
          <span>/</span>
          <Link href="/tasks" className="hover:text-black">Bài tập oral</Link>
          <span>/</span>
          <span className="font-semibold text-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4f46e5]" />
            Phòng thi Giữa kỳ CS102
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] font-medium text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Đường truyền: ổn định (18ms)
          </span>
          <button type="button" className="text-gray-400 hover:text-black">🔔</button>
          <button type="button" className="text-gray-400 hover:text-black">❓</button>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-5">
        {/* BANNER HEADER */}
        <section className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] font-bold text-[10px] tracking-wide">
                KỲ THI CHÍNH THỨC: GIỮA KỲ (HIGH-STAKES EXAM)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#4338ca] border border-[#c7d2fe] font-bold text-[10px]">
                CS102: CẤU TRÚC DỮ LIỆU &amp; GIẢI THUẬT
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono">Mã ca thi: {examId}</p>
            <h1 className="text-xl md:text-2xl font-black text-[#111827] mt-1 tracking-tight">
              Kiểm tra Thiết bị &amp; Xác thực Quy chế Phòng thi (AI Proctoring Check)
            </h1>
            <p className="text-gray-500 mt-1 text-[11px] leading-relaxed">
              Yêu cầu bắt buộc hiệu chuẩn Microphone Âm học và Webcam Giám thị AI trước khi mở niêm phong đề thi. Thí sinh cần giữ tầm nhìn trực diện và môi trường không tạp âm.
            </p>
          </div>

          {/* BOX ĐẾM NGƯỢC THỜI GIAN HIỆU CHUẨN */}
          <div className="shrink-0 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 flex items-center gap-3.5 min-w-[200px]">
            <div>
              <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Thời gian hiệu chuẩn còn lại
              </span>
              <span className="text-2xl font-mono font-black text-[#dc2626]">
                00:{formatTime(timeLeft)}
              </span>
              <span className="block text-[9px] text-gray-400 mt-0.5">Tự động chuyển tiếp khi hết giờ</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#fee2e2] text-[#dc2626] flex items-center justify-center text-sm font-bold">
              ⏱️
            </div>
          </div>
        </section>

        {/* 3. GRID 2 CỘT: WEBCAM + MICROPHONE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CỘT TRÁI: WEBCAM AI PROCTORING */}
          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-2">
                <span className="text-sm">📹</span>
                <span className="font-bold text-xs text-[#111827]">Webcam AI Proctoring Feed</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                ACTIVE LIVE STREAM
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Thiết bị camera phát hiện:</label>
              <select className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs font-medium outline-none">
                <option>FaceTime HD Camera (Built-in 1080p)</option>
                <option>Logitech C920 Pro HD Webcam</option>
              </select>
            </div>

            {/* KHUNG MÔ PHỎNG CAMERA AI BORDER */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 h-52 flex items-center justify-center border border-gray-700 shadow-inner group">
              {/* Ảnh hoặc video mô phỏng thí sinh */}
              <div className="w-full h-full relative flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600"
                  alt="Webcam Preview"
                  className="w-full h-full object-cover opacity-90"
                />

                {/* Khung xanh nhận diện AI khuôn mặt */}
                <div className="absolute inset-x-12 inset-y-6 border-2 border-[#10b981] rounded-lg pointer-events-none flex flex-col justify-between p-2">
                  <span className="text-[9px] text-[#10b981] font-mono bg-black/60 px-1.5 py-0.5 rounded self-start">
                    AI GAZE: 0.02° (CENTER)
                  </span>
                  <span className="text-[10px] text-white font-bold bg-[#10b981] px-2 py-0.5 rounded self-center shadow">
                    Lê Thị Bình - Đã khớp sinh trắc học
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                  <span>📷</span> Đang bật Camera
                </div>
              </div>
            </div>

            {/* 3 THÔNG SỐ CHUẨN HÓA WEBCAM */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-2">
                <span className="block text-gray-400">Độ phân giải</span>
                <span className="font-bold text-gray-800">1920 × 1080 @ 30fps</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-2">
                <span className="block text-gray-400">Ánh sáng &amp; Góc quay</span>
                <span className="font-bold text-[#059669]">Đạt chuẩn</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-2">
                <span className="block text-gray-400">Xác thực khuôn mặt</span>
                <span className="font-bold text-[#059669]">Đã khớp sinh trắc</span>
              </div>
            </div>
          </section>

          {/* CỘT PHẢI: KIỂM TRA ÂM THANH & MICROPHONE */}
          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎙️</span>
                <span className="font-bold text-xs text-[#111827]">Kiểm tra Âm thanh &amp; Microphone</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] text-[9px] font-bold">
                Đã kết nối
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Thiết bị thu âm phát hiện:</label>
              <select className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs font-medium outline-none">
                <option>MacBook Pro Microphone Array (Acoustic Noise Filter)</option>
                <option>Rode NT-USB Mini (Chống ồn AI Bật)</option>
              </select>
            </div>

            {/* MÔ PHỎNG SÓNG ÂM THANH REALTIME */}
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  Phổ âm thanh thời gian thực
                </span>
                <span className="text-[11px] font-bold text-[#111827]">Âm lượng: Tốt (Rõ ràng)</span>
              </div>

              {/* Dải thanh sóng âm giả lập */}
              <div className="h-12 flex items-center justify-center gap-1.5 px-2 bg-white rounded-lg border border-[#e5e7eb]">
                {[20, 35, 15, 45, 28, 50, 32, 40, 24, 38, 18, 48, 30, 42, 22, 36, 16, 28, 12].map((height, i) => (
                  <span
                    key={i}
                    style={{ height: `${height}px` }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      i % 3 === 0 ? 'bg-[#4f46e5]' : i % 2 === 0 ? 'bg-[#818cf8]' : 'bg-[#c7d2fe]'
                    }`}
                  />
                ))}
              </div>

              <p className="text-[10px] text-center text-gray-500 italic">
                Hãy đọc to: &quot;Tôi là Lê Thị Bình, sẵn sàng tham gia kỳ thi CS102&quot;
              </p>

              {/* Thanh dB đo âm lượng */}
              <div className="space-y-1">
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#10b981] h-full" style={{ width: `${micVolume}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                  <span>-40dB</span>
                  <span>0dB</span>
                </div>
              </div>
            </div>

            {/* CHỈ SỐ LỌC ÂM */}
            <div className="space-y-2 text-[10px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span>⚡</span> Lọc tạp âm AI (Noise suppression)
                </span>
                <span className="font-bold text-[#059669]">94.8% (Tối ưu)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#f9fafb] border border-[#e5e7eb]">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span>🗣️</span> Độ rõ phát âm (Speech Clarity)
                </span>
                <span className="font-bold text-[#4338ca]">Chuẩn ASR (A+)</span>
              </div>
            </div>

            {/* NÚT THỬ GIỌNG ĐỌC MẪU */}
            <button
              type="button"
              onClick={handleTestMic}
              disabled={isRecordingSample}
              className="w-full py-2.5 rounded-xl border border-[#e5e7eb] bg-white hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>📢</span>
              <span>{isRecordingSample ? 'Đang thu mẫu âm thanh (5s)...' : 'Thử giọng đọc mẫu (5s)'}</span>
            </button>
          </section>
        </div>

        {/* 4. THÔNG SỐ CA THI & CAM KẾT QUY CHẾ */}
        <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#f3f4f6] gap-2">
            <div>
              <h2 className="font-bold text-xs text-[#111827] flex items-center gap-2">
                <span>🛡️</span> Thông số Ca thi &amp; Cam kết Quy chế Giám sát AI
              </h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Quy chế thi trực tuyến công nhận bởi Ban Khảo thí &amp; Đảm bảo Chất lượng đào tạo
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono text-gray-600">
              <span>⏱️ 15 phút tổng</span>
              <span>⌛ 120 giây / câu</span>
              <span>📝 03 câu</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
            <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] space-y-1">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <span>👁️</span> Giám sát Cử động mắt &amp; Khuôn mặt
              </span>
              <p className="text-gray-500 text-[10px] leading-relaxed">
                Không rời mắt khỏi màn hình quá 10 giây hoặc chuyển tab trình duyệt. AI tự động ghi nhận vi phạm.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] space-y-1">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <span>🔊</span> Phát hiện Tạp âm &amp; Người thứ ba
              </span>
              <p className="text-gray-500 text-[10px] leading-relaxed">
                Phân tách giọng nói sinh viên với giọng nói ngoại cảnh (Diarization). Phòng thi cần yên tĩnh tuyệt đối.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] space-y-1">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <span>🔒</span> Mã hóa Bản ghi Khảo thí FLAC
              </span>
              <p className="text-gray-500 text-[10px] leading-relaxed">
                Âm thanh câu trả lời được ký số SHA-256 ngay khi nộp bài để phục vụ phúc khảo và chấm điểm AI độc lập.
              </p>
            </div>
          </div>

          {/* CHECKBOX CAM KẾT */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] cursor-pointer hover:bg-gray-100 transition">
            <input
              type="checkbox"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
            />
            <span className="text-[11px] text-gray-700 leading-relaxed">
              <strong>Xác nhận cam kết trung thực học thuật:</strong> Tôi cho phép AIOralCheck ghi hình webcam liên tục và thu âm phổ âm thanh để AI phát hiện cử động mắt, tiếng ồn lạ và chống gian lận trong suốt ca thi. Tôi cam kết tự làm bài và không có sự trợ giúp của bên thứ ba.
            </span>
          </label>
        </section>

        {/* 5. FOOTER ACTION BAR */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/tasks"
            className="px-4 py-2.5 rounded-xl border border-[#e5e7eb] bg-white hover:bg-gray-50 font-bold text-xs flex items-center gap-2 transition"
          >
            <span>←</span> Quay lại danh sách bài tập
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#059669] font-semibold">
              <span>✅</span> Môi trường thi đã sẵn sàng 100%
            </span>

            <button
              type="button"
              disabled={!agreementChecked}
              onClick={() => router.push(`/student/exam/${examId}/room`)}
              className="px-6 py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>((•))</span>
              <span>Xác nhận thiết bị &amp; Vào làm bài thi ngay</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}