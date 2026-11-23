'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import StudentPageShell from '@/components/layout/StudentPageShell';
import {
  getPreferredMicId,
  getSpeechRecognition,
  microphoneErrorMessage,
  openMicrophone,
  pickRecorderMimeType,
  savePreferredMicId,
  type LiveRecognition,
} from '@/features/exam/lib/microphone';

/** Giây đầu giữ yên lặng để đo tạp âm nền, sau đó đọc câu mẫu. */
const NOISE_MS = 1500;
const SPEAK_MS = 6000;
const METER_FLOOR_DB = -60;
const SAMPLE_SENTENCE = 'Tôi đang kiểm tra micro trước khi làm bài thi vấn đáp';

type Phase = 'idle' | 'ready' | 'recording' | 'done';
type Frame = { at: number; db: number; peak: number };
type TestResult = { level: 'good' | 'warn' | 'bad'; messages: string[]; speechDb: number; noiseDb: number };

const toDb = (value: number) => Math.max(METER_FLOOR_DB, 20 * Math.log10(Math.max(value, 1e-6)));
const percentile = (sorted: number[], ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))];
const words = (text: string) => text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const SAMPLE_WORDS = words(SAMPLE_SENTENCE);

/** Ước lượng chất lượng thu âm từ mức âm lượng: im lặng, quá nhỏ, bị rè, tạp âm nền lớn. */
function analyseTest(frames: Frame[]): TestResult {
  const noiseFrames = frames.filter((frame) => frame.at < NOISE_MS).map((frame) => frame.db).sort((a, b) => a - b);
  const speechFrames = frames.filter((frame) => frame.at >= NOISE_MS);
  if (noiseFrames.length < 5 || speechFrames.length < 10) {
    return { level: 'bad', messages: ['Bản ghi quá ngắn để đánh giá. Hãy ghi lại và đọc hết câu mẫu.'], speechDb: METER_FLOOR_DB, noiseDb: METER_FLOOR_DB };
  }
  const noiseDb = percentile(noiseFrames, 0.5);
  const speechDb = percentile(speechFrames.map((frame) => frame.db).sort((a, b) => a - b), 0.9);
  if (speechDb < -50) {
    return { level: 'bad', messages: ['Gần như không nghe thấy tiếng. Kiểm tra micro có đang tắt tiếng (mute) hoặc chọn nhầm thiết bị không.'], speechDb, noiseDb };
  }
  const voicedRatio = speechFrames.filter((frame) => frame.db > Math.max(noiseDb + 10, -50)).length / speechFrames.length;
  const clipRatio = speechFrames.filter((frame) => frame.peak >= 0.99).length / speechFrames.length;
  const messages: string[] = [];
  if (voicedRatio < 0.15) messages.push('Phần lớn thời gian là im lặng. Hãy đọc câu mẫu ngay khi được nhắc.');
  if (clipRatio > 0.01) messages.push('Tiếng bị rè vì quá to. Hãy để micro xa miệng hơn hoặc nói nhỏ lại một chút.');
  if (speechDb < -32) messages.push('Giọng hơi nhỏ. Hãy nói to, rõ hơn hoặc ngồi gần micro hơn (khoảng 15–30 cm).');
  if (speechDb - noiseDb < 15) messages.push('Tạp âm xung quanh khá lớn so với giọng nói. Hãy tìm chỗ yên tĩnh hơn hoặc dùng tai nghe có micro.');
  if (!messages.length) return { level: 'good', messages: ['Âm thanh rõ, đủ lớn và ít tạp âm. Bạn có thể vào làm bài.'], speechDb, noiseDb };
  return { level: 'warn', messages, speechDb, noiseDb };
}

export default function StudentRecorder({ assignmentId }: { assignmentId?: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [meterDb, setMeterDb] = useState(METER_FLOOR_DB);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState('');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [liveText, setLiveText] = useState('');
  const [liveSupported, setLiveSupported] = useState(false);

  const framesRef = useRef<Frame[]>([]);
  const recordStartRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<LiveRecognition | null>(null);
  const autoStopRef = useRef<number | null>(null);

  // Tắt micro khi đổi thiết bị hoặc rời trang.
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);
  useEffect(() => () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [recordingUrl]);
  useEffect(() => () => {
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    recognitionRef.current?.stop();
  }, []);

  // Đo âm lượng liên tục; khi đang ghi thử thì lưu lại từng khung để đánh giá.
  useEffect(() => {
    if (!stream) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frameId = 0;
    let lastPaint = 0;

    function measure() {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      let peak = 0;
      for (const sample of samples) {
        sum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
      }
      const db = toDb(Math.sqrt(sum / samples.length));
      const now = performance.now();
      if (recordStartRef.current !== null) framesRef.current.push({ at: now - recordStartRef.current, db, peak });
      if (now - lastPaint >= 100) {
        lastPaint = now;
        setMeterDb(db);
        setElapsedMs(recordStartRef.current !== null ? now - recordStartRef.current : 0);
      }
      frameId = window.requestAnimationFrame(measure);
    }

    void audioContext.resume().catch(() => setError('Trình duyệt không khởi động được bộ đo âm thanh. Hãy tải lại trang.'));
    frameId = window.requestAnimationFrame(measure);
    return () => {
      window.cancelAnimationFrame(frameId);
      source.disconnect();
      void audioContext.close();
    };
  }, [stream]);

  // Tên micro chỉ có sau khi đã cấp quyền; cập nhật khi cắm/rút thiết bị.
  useEffect(() => {
    if (!stream) return;
    const refresh = () => {
      navigator.mediaDevices.enumerateDevices()
        .then((list) => setDevices(list.filter((device) => device.kind === 'audioinput' && device.deviceId)))
        .catch(() => undefined);
    };
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh);
  }, [stream]);

  async function connect(nextDeviceId = deviceId ?? getPreferredMicId()) {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.AudioContext) {
      setError('Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Firefox mới qua HTTPS hoặc localhost.');
      return;
    }
    try {
      const nextStream = await openMicrophone(nextDeviceId);
      const activeId = nextStream.getAudioTracks()[0]?.getSettings().deviceId;
      setStream(nextStream);
      setDeviceId(activeId);
      if (nextDeviceId && activeId) savePreferredMicId(activeId);
      setLiveSupported(Boolean(getSpeechRecognition()));
      setPhase((current) => (current === 'done' ? 'done' : 'ready'));
    } catch (reason) {
      setError(microphoneErrorMessage(reason));
    }
  }

  function chooseDevice(nextDeviceId: string) {
    savePreferredMicId(nextDeviceId);
    setResult(null);
    void connect(nextDeviceId);
  }

  function disconnect() {
    setStream(null);
    setPhase('idle');
    setMeterDb(METER_FLOOR_DB);
  }

  function startTest() {
    if (!stream) return;
    setError('');
    setResult(null);
    setLiveText('');
    setRecordingUrl(null);
    framesRef.current = [];

    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size) setRecordingUrl(URL.createObjectURL(blob));
      setResult(analyseTest(framesRef.current));
      setPhase('done');
    };

    const Recognition = getSpeechRecognition();
    if (Recognition) {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';
      recognition.onresult = (event) => setLiveText(Array.from(event.results).map((item) => item[0].transcript).join(' ').trim());
      recognition.onerror = () => undefined;
      recognitionRef.current = recognition;
      try { recognition.start(); } catch { recognitionRef.current = null; }
    }

    recorderRef.current = recorder;
    recordStartRef.current = performance.now();
    recorder.start();
    setPhase('recording');
    autoStopRef.current = window.setTimeout(stopTest, NOISE_MS + SPEAK_MS);
  }

  function stopTest() {
    if (autoStopRef.current) { window.clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    recordStartRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    recorderRef.current = null;
  }

  const meterPercent = Math.round(((meterDb - METER_FLOOR_DB) / -METER_FLOOR_DB) * 100);
  const meterColor = meterDb > -6 ? 'bg-red-500' : meterDb > -32 ? 'bg-emerald-600' : 'bg-amber-500';
  const inNoiseWindow = phase === 'recording' && elapsedMs < NOISE_MS;
  const secondsLeft = Math.max(0, Math.ceil((NOISE_MS + SPEAK_MS - elapsedMs) / 1000));
  const heard = new Set(words(liveText));
  const matchedWords = SAMPLE_WORDS.filter((word) => heard.has(word)).length;
  const returnHref = assignmentId ? `/student/assignments/${assignmentId}` : '/student/classes';
  const resultStyle = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    bad: 'border-red-200 bg-red-50 text-red-800',
  };

  return (
    <StudentPageShell currentPage="recorder" breadcrumb="Thử micro">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-[23px] font-semibold leading-tight sm:text-[28px]">Thử micro trước khi làm bài</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          Ghi thử vài giây để chắc micro thu rõ giọng. Âm thanh rõ giúp hệ thống chuyển giọng nói thành văn bản chính xác hơn, và AI chấm đúng ý bạn trả lời.
          Bản ghi thử chỉ nằm trên máy bạn, không được tải lên hệ thống.
        </p>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-bold">1. Kết nối micro</h2>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${stream ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>
              {stream ? '● Đã kết nối' : 'Chưa kết nối'}
            </span>
          </div>

          {!stream ? (
            <button type="button" onClick={() => void connect()} className="rounded-full bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800">
              Cho phép dùng micro
            </button>
          ) : (
            <div className="space-y-3">
              {devices.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="mic-device" className="block text-xs font-semibold text-gray-700">Micro đang dùng</label>
                  <select
                    id="mic-device"
                    value={deviceId ?? ''}
                    disabled={phase === 'recording'}
                    onChange={(event) => chooseDevice(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-100"
                  >
                    {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Micro ${index + 1}`}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-500">Micro bạn chọn sẽ được dùng lại khi làm bài trên trình duyệt này.</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-600">
                  <span>Âm lượng hiện tại</span>
                  <span className="font-mono">{Math.round(meterDb)} dB</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gray-200" role="meter" aria-label="Âm lượng micro" aria-valuemin={METER_FLOOR_DB} aria-valuemax={0} aria-valuenow={Math.round(meterDb)}>
                  <div className={`h-full transition-[width] duration-100 ${meterColor}`} style={{ width: `${meterPercent}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Khi nói bình thường, thanh nên ở vùng xanh. Vàng là quá nhỏ, đỏ là quá to (dễ bị rè).</p>
              </div>
              <button type="button" onClick={disconnect} disabled={phase === 'recording'} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-40">Tắt micro</button>
            </div>
          )}

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">{error}</p>}

          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-[14px] font-bold">2. Ghi thử</h2>
            <p className="mt-1 text-[12px] text-gray-600">
              Bấm ghi thử, <strong>giữ yên lặng 1–2 giây đầu</strong> để đo tạp âm, rồi đọc to câu:
            </p>
            <p className="mt-2 rounded-lg bg-gray-100 p-3 text-center text-sm font-semibold text-gray-900">“{SAMPLE_SENTENCE}.”</p>

            {phase === 'recording' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span aria-live="polite" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${inNoiseWindow ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'}`}>
                  {inNoiseWindow ? 'Giữ yên lặng…' : `● Đọc câu mẫu — còn ${secondsLeft} giây`}
                </span>
                <button type="button" onClick={stopTest} className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium hover:bg-gray-50">Dừng</button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!stream}
                onClick={startTest}
                className="mt-3 rounded-full bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {phase === 'done' ? 'Ghi thử lại' : 'Bắt đầu ghi thử'}
              </button>
            )}

            {liveSupported && (phase === 'recording' || liveText) && (
              <div className="mt-3 rounded-lg border border-gray-200 p-3 text-xs">
                <p className="font-semibold text-gray-700">Trình duyệt nghe được</p>
                <p className="mt-1 min-h-5 text-gray-800">{liveText || '…'}</p>
                {phase === 'done' && <p className="mt-2 text-gray-500">Khớp {matchedWords}/{SAMPLE_WORDS.length} từ của câu mẫu (nhận dạng nhanh của trình duyệt, chỉ để tham khảo).</p>}
              </div>
            )}
          </div>

          {phase === 'done' && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <h2 className="text-[14px] font-bold">3. Kết quả</h2>
              {recordingUrl && (
                <div>
                  <p className="text-xs text-gray-600">Nghe lại bản ghi thử — giọng có rõ, có bị rè hay lẫn tiếng ồn không?</p>
                  <audio controls src={recordingUrl} className="mt-2 w-full" />
                </div>
              )}
              {result && (
                <div role="status" className={`rounded-lg border p-3 text-sm ${resultStyle[result.level]}`}>
                  <p className="font-semibold">{result.level === 'good' ? 'Micro ổn' : result.level === 'warn' ? 'Nên chỉnh lại trước khi làm bài' : 'Micro chưa dùng được'}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{result.messages.map((message) => <li key={message}>{message}</li>)}</ul>
                  <p className="mt-2 text-[11px] opacity-80">Giọng nói ≈ {Math.round(result.speechDb)} dB · Tạp âm nền ≈ {Math.round(result.noiseDb)} dB (ước lượng)</p>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-[14px] font-bold">Mẹo để transcript chính xác</h2>
          <ul className="list-disc space-y-2 pl-5 text-[12px] leading-relaxed text-gray-700">
            <li>Ngồi ở chỗ yên tĩnh, tắt quạt, TV, nhạc nền.</li>
            <li>Giữ micro cách miệng khoảng 15–30 cm; tai nghe có micro thường thu rõ hơn micro laptop.</li>
            <li>Nói rõ từng ý, tốc độ vừa phải; đọc rõ các thuật ngữ chuyên môn.</li>
            <li>Đóng các ứng dụng khác đang dùng micro (Zoom, Meet, Messenger…).</li>
            <li>Sau mỗi câu, nghe lại bản ghi và kiểm tra transcript trước khi chọn bản nộp.</li>
          </ul>
          <Link href={returnHref} className="mt-2 inline-flex rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold hover:bg-gray-50">
            {assignmentId ? '← Quay lại bài tập' : '← Về lớp học của tôi'}
          </Link>
        </aside>
      </div>
    </StudentPageShell>
  );
}
