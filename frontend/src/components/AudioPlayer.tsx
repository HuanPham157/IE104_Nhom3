'use client';

import { useRef, useState } from 'react';

const MIME_LABEL: Record<string, string> = {
  'audio/webm': 'WebM', 'audio/ogg': 'OGG', 'audio/mp4': 'M4A', 'audio/mpeg': 'MP3', 'audio/wav': 'WAV',
};

/**
 * Trình phát audio bài làm (signed URL của bucket private) — thay cho thẻ <audio> trần:
 *  - Liên kết hết hạn/lỗi tải: tự xin liên kết mới một lần qua `onRefresh`, sau đó hiện lý do và nút "Thử lại".
 *  - Trình duyệt không hỗ trợ định dạng (ví dụ WebM trên Safari cũ): nói rõ và cho mở file.
 *  - File WebM do MediaRecorder ghi không có độ dài (0:00): tua tạm tới cuối để trình duyệt tính độ dài.
 * Đổi bài làm thì dùng `key` khác để trình phát bắt đầu lại.
 */
export default function AudioPlayer({ src, mimeType, onRefresh, label, preload = 'metadata', className = '' }: {
  src: string | null | undefined;
  mimeType?: string | null;
  /** Xin signed URL mới (trả null nếu không lấy được). */
  onRefresh?: () => Promise<string | null>;
  label?: string;
  preload?: 'none' | 'metadata' | 'auto';
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState(src ?? null);
  const [error, setError] = useState('');
  const [retried, setRetried] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const baseMime = mimeType?.split(';')[0].trim() ?? '';
  const format = MIME_LABEL[baseMime] ?? (baseMime || 'âm thanh');

  async function refresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    setError('');
    const next = await onRefresh().catch(() => null);
    setRefreshing(false);
    if (next) setUrl(next);
    else setError('Không lấy được liên kết mới cho file ghi âm. Hãy tải lại trang.');
  }

  function handleError() {
    const audio = audioRef.current;
    if (baseMime && audio && audio.canPlayType(baseMime) === '') {
      setError(`Trình duyệt này không phát được định dạng ${format}. Hãy dùng Chrome, Edge hoặc Firefox, hoặc mở file để tải về.`);
      return;
    }
    // Lỗi tải (thường do liên kết đã hết hạn): tự xin liên kết mới một lần.
    if (onRefresh && !retried) {
      setRetried(true);
      void refresh();
      return;
    }
    setError('Trình duyệt chưa tải được file ghi âm (liên kết hết hạn hoặc tài khoản này chưa có quyền đọc file). Bấm "Mở file" để xem lý do chi tiết.');
  }

  function fixMissingDuration() {
    const audio = audioRef.current;
    if (!audio || audio.duration !== Infinity) return;
    const restore = () => {
      audio.removeEventListener('timeupdate', restore);
      audio.currentTime = 0;
    };
    audio.addEventListener('timeupdate', restore);
    audio.currentTime = 1e101;
  }

  if (!url) {
    return <p className={`rounded-lg bg-gray-50 p-3 text-xs text-gray-500 ${className}`}>Chưa có file ghi âm.</p>;
  }
  return (
    <div className={className}>
      <audio
        ref={audioRef}
        key={url}
        controls
        preload={preload}
        src={url}
        onError={handleError}
        onLoadedMetadata={fixMissingDuration}
        aria-label={label}
        className="w-full"
      />
      {(error || refreshing) && (
        <div role={error ? 'alert' : 'status'} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          <span className="min-w-0 flex-1">{refreshing ? 'Đang lấy liên kết mới cho file ghi âm…' : error}</span>
          {!refreshing && onRefresh && <button type="button" onClick={() => void refresh()} className="rounded-full border border-amber-300 bg-white px-2.5 py-1 font-semibold hover:bg-amber-100">Thử lại</button>}
          {!refreshing && <a href={url} target="_blank" rel="noreferrer" className="rounded-full border border-amber-300 bg-white px-2.5 py-1 font-semibold hover:bg-amber-100">Mở file</a>}
        </div>
      )}
    </div>
  );
}
