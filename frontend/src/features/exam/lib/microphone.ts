/**
 * Mở micro và ghi âm dùng chung cho trang thử micro và trang làm bài:
 * cùng cấu hình xử lý âm thanh của trình duyệt, cùng micro sinh viên đã chọn khi thử.
 */

const PREFERRED_MIC_KEY = 'aioralcheck:preferred-mic';

/** Phần Web Speech API đang dùng để hiện transcript tạm thời (Chrome/Edge). */
export type LiveRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type LiveRecognitionConstructor = new () => LiveRecognition;

export function getSpeechRecognition(): LiveRecognitionConstructor | undefined {
  const recognitionApi = window as Window & { SpeechRecognition?: LiveRecognitionConstructor; webkitSpeechRecognition?: LiveRecognitionConstructor };
  return recognitionApi.SpeechRecognition ?? recognitionApi.webkitSpeechRecognition;
}

/** Lọc vọng, lọc tạp âm, tự cân âm lượng, 1 kênh — giảm lỗi nhận dạng giọng nói. */
function audioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };
}

export function getPreferredMicId(): string | undefined {
  try {
    return window.localStorage.getItem(PREFERRED_MIC_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function savePreferredMicId(deviceId: string | undefined) {
  try {
    if (deviceId) window.localStorage.setItem(PREFERRED_MIC_KEY, deviceId);
    else window.localStorage.removeItem(PREFERRED_MIC_KEY);
  } catch {
    // Trình duyệt chặn lưu trữ: lần sau dùng micro mặc định.
  }
}

/** Mở micro đã chọn; nếu micro đó không còn (rút tai nghe…) thì quay về micro mặc định. */
export async function openMicrophone(deviceId = getPreferredMicId()): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(deviceId) });
  } catch (error) {
    const missingDevice = error instanceof DOMException
      && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError');
    if (!deviceId || !missingDevice) throw error;
    savePreferredMicId(undefined);
    return navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
  }
}

/** Định dạng ghi âm đầu tiên trình duyệt hỗ trợ (đều nằm trong danh sách API /answers chấp nhận). */
export function pickRecorderMimeType(): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

export function microphoneErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Bạn đã từ chối quyền dùng micro. Hãy cho phép micro trong cài đặt trình duyệt (biểu tượng ổ khóa cạnh thanh địa chỉ) rồi thử lại.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'Không tìm thấy micro. Hãy cắm micro hoặc tai nghe rồi thử lại.';
  }
  if (error instanceof DOMException && error.name === 'NotReadableError') {
    return 'Micro đang được ứng dụng khác sử dụng (Zoom, Meet…). Hãy đóng ứng dụng đó rồi thử lại.';
  }
  return 'Không thể truy cập micro. Hãy dùng Chrome/Edge/Firefox mới qua HTTPS hoặc localhost rồi thử lại.';
}
