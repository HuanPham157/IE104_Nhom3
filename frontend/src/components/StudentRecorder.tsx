'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import StudentPageShell from '@/components/StudentPageShell';

function RecorderIcon({ name }: { name: 'camera' | 'mic' | 'shield' | 'clock' | 'check' | 'lock' }) {
  const paths = {
    camera: 'M23 7l-7 5 7 5V7z M1 5h15v14H1z',
    mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
    shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
    clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
    check: 'M20 6 9 17l-5-5',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 1 1 8 0v4',
  };
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

function mediaErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Bạn đã từ chối quyền truy cập. Hãy cho phép camera và micro trong cài đặt trình duyệt rồi thử lại.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'Không tìm thấy camera hoặc micro. Hãy kết nối thiết bị rồi thử lại.';
  }
  if (error instanceof DOMException && error.name === 'NotReadableError') {
    return 'Camera hoặc micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  return 'Không thể kết nối thiết bị. Hãy kiểm tra quyền truy cập và thử lại.';
}

export default function StudentRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(() => Array(24).fill(0));
  const [audioLevel, setAudioLevel] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const [consent, setConsent] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [examNotice, setExamNotice] = useState('');

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = mediaStream;
  }, [mediaStream]);

  useEffect(() => () => {
    mediaStream?.getTracks().forEach((track) => track.stop());
  }, [mediaStream]);

  const calibrationExpired = remainingSeconds === 0;
  useEffect(() => {
    if (!mediaStream || calibrationExpired) return;
    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [calibrationExpired, mediaStream]);

  useEffect(() => {
    if (!mediaStream) return;

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(mediaStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    let frameId = 0;
    let lastUpdate = 0;

    function measureAudio() {
      analyser.getByteTimeDomainData(samples);
      const levels = Array.from({ length: 24 }, (_, index) =>
        Math.min(1, Math.abs(samples[index % samples.length] - 128) / 64),
      );
      if (performance.now() - lastUpdate >= 100) {
        lastUpdate = performance.now();
        setAudioLevels(levels);
        setAudioLevel(Math.round(Math.max(...levels) * 100));
      }
      frameId = window.requestAnimationFrame(measureAudio);
    }

    void audioContext.resume().catch(() => {
      setMediaError('Trình duyệt không thể khởi động bộ đo âm thanh. Hãy tải lại trang và thử lại.');
    });
    frameId = window.requestAnimationFrame(measureAudio);

    return () => {
      window.cancelAnimationFrame(frameId);
      source.disconnect();
      void audioContext.close();
    };
  }, [mediaStream]);

  async function checkDevices() {
    setMediaError('');
    setExamNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Trình duyệt không hỗ trợ truy cập camera và micro. Hãy dùng trình duyệt hiện đại qua HTTPS.');
      return;
    }
    if (!window.AudioContext) {
      setMediaError('Trình duyệt không hỗ trợ bộ đo âm thanh. Hãy dùng trình duyệt hiện đại để kiểm tra thiết bị.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMediaStream(stream);
      setRemainingSeconds(300);
    } catch (error) {
      setMediaError(mediaErrorMessage(error));
    }
  }

  function stopDevices() {
    mediaStream?.getTracks().forEach((track) => track.stop());
    setMediaStream(null);
    setAudioLevels(Array(24).fill(0));
    setAudioLevel(0);
    setRemainingSeconds(300);
  }

  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  const ready = Boolean(mediaStream) && consent && remainingSeconds > 0;

  return (
    <StudentPageShell currentPage="recorder" breadcrumb="Bài tập oral › Phòng thi giữa kỳ CS102">
      <section className="rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[9px] font-bold text-emerald-800">KỲ THI CHÍNH THỨC: GIỮA KỲ (HIGH-STAKES EXAM)</span>
              <span className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-[9px] font-bold text-indigo-800">CS102: CẤU TRÚC DỮ LIỆU &amp; GIẢI THUẬT</span>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">Mã ca thi: CS102-MID-2024-03</p>
            <h1 className="mt-2 text-[23px] font-semibold leading-tight sm:text-[28px]">Kiểm tra Thiết bị &amp; Xác thực Quy chế Phòng thi (AI Proctoring Check)</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">Yêu cầu bắt buộc hiệu chuẩn Microphone Âm học và Webcam Giám thị AI trước khi mở niêm phong đề thi. Thí sinh cần giữ tầm nhìn trực diện và môi trường không tạp âm.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-[#f4f4f4] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Thời gian hiệu chuẩn còn lại</p>
            <p aria-live="polite" className={`mt-1 text-[25px] font-bold leading-none ${remainingSeconds === 0 ? 'text-red-700' : 'text-red-600'}`}>{minutes}:{seconds}</p>
            <p className="mt-1 text-[10px] text-gray-600">{remainingSeconds === 0 ? 'Hết thời gian hiệu chuẩn. Vui lòng kiểm tra lại với giảng viên.' : 'Bắt đầu đếm ngược sau khi cấp quyền thiết bị.'}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.95fr)]">
        <section className="rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[14px] font-bold"><RecorderIcon name="camera" />Webcam AI Proctoring Feed</h2>
            <span className={`rounded-full border px-3 py-1 text-[9px] font-bold ${mediaStream ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>{mediaStream ? '● ĐÃ KẾT NỐI' : 'CHƯA KẾT NỐI'}</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">Thiết bị camera phát hiện: {mediaStream ? 'Camera mặc định' : 'Chưa kiểm tra'}</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-[#171717]">
            <div className="relative aspect-video">
              {mediaStream ? (
                <video ref={videoRef} autoPlay muted playsInline aria-label="Xem trước camera" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-300">
                  <RecorderIcon name="camera" />
                  <p className="text-xs">Bật camera để xem trước hình ảnh</p>
                </div>
              )}
              {mediaStream && <div className="pointer-events-none absolute inset-[14%] rounded-lg border-2 border-emerald-500/80" />}
              {mediaStream && <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-3 py-1.5 text-[10px] font-medium text-gray-800">Camera đang hoạt động</span>}
            </div>
          </div>
          {mediaError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">{mediaError}</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-[#f5f5f5] p-3 text-center"><p className="text-[10px] text-gray-500">Độ phân giải</p><b className="mt-1 block text-[10px]">{mediaStream ? 'Camera đã kết nối' : 'Chưa kiểm tra'}</b></div>
            <div className="rounded-lg border border-gray-200 bg-[#f5f5f5] p-3 text-center"><p className="text-[10px] text-gray-500">Ánh sáng &amp; Góc quay</p><b className={`mt-1 block text-[10px] ${mediaStream ? 'text-emerald-700' : 'text-gray-500'}`}>{mediaStream ? 'Đã bật camera' : 'Chờ kiểm tra'}</b></div>
            <div className="rounded-lg border border-gray-200 bg-[#f5f5f5] p-3 text-center"><p className="text-[10px] text-gray-500">Xác thực khuôn mặt</p><b className="mt-1 block text-[10px] text-gray-600">Chưa tích hợp</b></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void checkDevices()} className="rounded-full bg-[#111] px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-gray-800">{mediaStream ? 'Kiểm tra lại thiết bị' : 'Kết nối webcam & microphone'}</button>
            {mediaStream && <button type="button" onClick={stopDevices} className="rounded-full border border-gray-300 px-4 py-2.5 text-[10px] font-medium hover:bg-gray-50">Tắt thiết bị</button>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3">
            <h2 className="flex items-center gap-2 text-[14px] font-bold"><span className="text-indigo-600"><RecorderIcon name="mic" /></span>Kiểm tra Âm thanh &amp; Microphone</h2>
            <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${mediaStream ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>{mediaStream ? 'Đã kết nối' : 'Chưa kiểm tra'}</span>
          </div>
          <p className="mt-4 text-[11px] text-gray-500">Thiết bị thu âm phát hiện: {mediaStream ? 'Microphone mặc định' : 'Chưa kiểm tra'}</p>
          <div className="mt-2 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2 text-[11px]"><span className="flex items-center gap-2 text-gray-700"><span className={`h-2 w-2 rounded-full ${mediaStream ? 'bg-emerald-600' : 'bg-gray-400'}`} />Phổ âm thanh thời gian thực</span><b>{mediaStream ? 'Micro đã cấp quyền' : 'Chưa kết nối'}</b></div>
            <div aria-hidden="true" className="mt-3 flex h-14 items-center justify-around rounded-lg bg-[#f2f2f2] px-2">
              {audioLevels.map((level, index) => <span key={index} className={`w-[3px] rounded-full ${level > 0.25 ? 'bg-indigo-500' : 'bg-gray-700'}`} style={{ height: `${Math.max(4, level * 44)}px` }} />)}
            </div>
            <p className="mt-3 text-center text-[10px] text-gray-500">Hãy đọc to: “Tôi là thí sinh CS102, sẵn sàng tham gia kỳ thi.”</p>
            <div className="mt-3 flex items-center gap-2 text-[9px] text-gray-500"><span>-40dB</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-emerald-700 transition-[width]" style={{ width: `${audioLevel}%` }} /></div><span>0dB</span></div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-[#f5f5f5] p-3 text-[10px]"><span className="flex items-center gap-2"><RecorderIcon name="shield" />Lọc tạp âm AI (Noise suppression)</span><b className="text-gray-600">{mediaStream ? 'Đã cấp quyền' : 'Chờ kết nối'}</b></div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-[#f5f5f5] p-3 text-[10px]"><span className="flex items-center gap-2"><RecorderIcon name="mic" />Độ rõ phát âm (Speech Clarity)</span><b className="text-gray-600">Chưa tích hợp</b></div>
          </div>
          <button type="button" onClick={() => void checkDevices()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 text-[10px] font-medium hover:bg-gray-50"><RecorderIcon name="mic" />{mediaStream ? 'Đọc câu mẫu để kiểm tra' : 'Cấp quyền & kiểm tra microphone'}</button>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100"><RecorderIcon name="shield" /></span><div><h2 className="text-[17px] font-bold">Thông số Ca thi &amp; Cam kết Quy chế Giám sát AI</h2><p className="text-[11px] text-gray-500">Quy chế thi trực tuyến công nhận bởi Ban Khảo thí &amp; Đảm bảo Chất lượng đào tạo</p></div></div>
          <div className="flex gap-5 text-[10px]"><span><span className="block text-gray-500">Thời gian làm bài</span><b>15 phút tổng</b></span><span><span className="block text-gray-500">Thời gian mỗi câu</span><b>120 giây / câu</b></span><span><span className="block text-gray-500">Cấu trúc đề</span><b>03 câu</b></span></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-gray-200 bg-[#f5f5f5] p-4"><h3 className="flex items-center gap-2 text-[11px] font-bold text-indigo-700"><RecorderIcon name="camera" />Giám sát Cử động mắt &amp; Khuôn mặt</h3><p className="mt-2 text-[11px] leading-relaxed text-gray-600">Không rời mắt khỏi màn hình quá 10 giây hoặc chuyển tab trình duyệt. Tính năng giám sát chưa được tích hợp trong bản xem trước.</p></article>
          <article className="rounded-xl border border-gray-200 bg-[#f5f5f5] p-4"><h3 className="flex items-center gap-2 text-[11px] font-bold text-emerald-700"><RecorderIcon name="mic" />Phát hiện Tạp âm &amp; Người thứ ba</h3><p className="mt-2 text-[11px] leading-relaxed text-gray-600">Phân tách giọng nói sinh viên với giọng nói ngoại cảnh (Diarization). Tính năng phân tích chưa được tích hợp.</p></article>
          <article className="rounded-xl border border-gray-200 bg-[#f5f5f5] p-4"><h3 className="flex items-center gap-2 text-[11px] font-bold"><RecorderIcon name="lock" />Mã hóa Bản ghi Khảo thí FLAC</h3><p className="mt-2 text-[11px] leading-relaxed text-gray-600">Bản xem trước không ghi hoặc lưu âm thanh và video. Bản ghi thi cần được tích hợp riêng trước khi sử dụng chính thức.</p></article>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-300 p-4">
          <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setExamNotice(''); }} className="mt-0.5 h-4 w-4 accent-black" />
          <span className="text-[12px] leading-relaxed"><b>Xác nhận cam kết trung thực học thuật:</b> Tôi cho phép AIOralCheck ghi hình webcam liên tục và thu âm phổ âm thanh để AI phát hiện cử động mắt, tiếng ồn lạ và chống gian lận trong suốt ca thi. Tôi cam kết tự làm bài và không có sự trợ giúp của bên thứ ba.<span className="mt-1 block text-[10px] text-gray-500">Trong bản xem trước, lựa chọn này chỉ dùng để mở khóa bước xác nhận; không có dữ liệu hình ảnh hoặc âm thanh nào được ghi lại.</span></span>
        </label>
      </section>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm">
        <Link href="/tasks" className="flex h-10 items-center gap-2 rounded-full border border-gray-300 px-4 text-[11px] hover:bg-gray-50">← Quay lại danh sách bài tập</Link>
        <span className={`flex items-center gap-2 text-[10px] font-medium ${ready ? 'text-emerald-700' : 'text-gray-500'}`}><RecorderIcon name="check" />{ready ? 'Đã kiểm tra thiết bị & xác nhận' : 'Cần kết nối thiết bị và xác nhận quy chế'}</span>
        <button type="button" disabled={!ready} onClick={() => setExamNotice('Bản xem trước đã kiểm tra thiết bị. Hệ thống thi và lưu bài chưa được tích hợp nên chưa thể bắt đầu ca thi thật.')} className="flex h-11 items-center gap-2 rounded-full bg-[#111] px-5 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300">
          <RecorderIcon name="shield" />Xác nhận thiết bị &amp; Vào làm bài thi ngay →
        </button>
        {examNotice && <p role="status" className="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{examNotice}</p>}
      </section>
    </StudentPageShell>
  );
}
