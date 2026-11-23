'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognition, microphoneErrorMessage, openMicrophone, pickRecorderMimeType, type LiveRecognition,
} from '@/features/exam/lib/microphone';

/** Câu hỏi đang ghi âm: dùng `id` để đặt tên file và `time_limit_seconds` để tự dừng. */
export type RecordTarget = { id: string; time_limit_seconds: number };

export type ActiveRecording = {
  questionId: string;
  startedAt: number;
  /** Transcript tạm thời từ Web Speech API (Chrome/Edge) trong lúc nói. */
  liveTranscript: string;
  liveSupported: boolean;
};

type AnswerRecorderOptions = {
  /** Gọi khi một bản ghi kết thúc (bấm dừng hoặc hết giờ của câu). */
  onRecorded: (target: RecordTarget, file: File, durationSeconds: number, liveTranscript: string) => void;
  onError: (message: string) => void;
};

/**
 * Ghi âm câu trả lời: MediaRecorder + nhận dạng tạm thời, tự dừng khi hết thời gian của câu hỏi,
 * và tắt micro khi rời trang. Mỗi lúc chỉ ghi một câu.
 */
export function useAnswerRecorder(options: AnswerRecorderOptions) {
  const [recording, setRecording] = useState<ActiveRecording | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<LiveRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<number | null>(null);
  // Luôn gọi callback mới nhất mà không phải tạo lại start/stop.
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const stop = useCallback(() => {
    if (autoStopRef.current) { window.clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(null);
  }, []);

  const start = useCallback(async (target: RecordTarget) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      optionsRef.current.onError('Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome/Edge/Firefox mới qua HTTPS hoặc localhost.');
      return;
    }
    try {
      const stream = await openMicrophone();
      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const startedAt = Date.now();
      chunksRef.current = [];

      const Recognition = getSpeechRecognition();
      let liveTranscript = '';
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';
        recognition.onresult = (event) => {
          liveTranscript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
          setRecording((current) => current ? { ...current, liveTranscript } : current);
        };
        recognition.onerror = () => undefined;
        recognitionRef.current = recognition;
        try { recognition.start(); } catch { recognitionRef.current = null; }
      }

      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size) return;
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `answer-${target.id}.${extension}`, { type: blob.type });
        const durationSeconds = Math.min(7200, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        optionsRef.current.onRecorded(target, file, durationSeconds, liveTranscript);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording({ questionId: target.id, startedAt, liveTranscript: '', liveSupported: Boolean(Recognition) });
      // Tự dừng khi hết thời gian cho phép của câu hỏi.
      autoStopRef.current = window.setTimeout(stop, target.time_limit_seconds * 1000);
    } catch (error) {
      optionsRef.current.onError(microphoneErrorMessage(error));
    }
  }, [stop]);

  // Rời trang: tắt micro, dừng nhận dạng và hẹn giờ.
  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recognitionRef.current?.stop();
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
  }, []);

  return { recording, start, stop };
}
