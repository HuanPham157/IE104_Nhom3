'use client';

import AnswerAnalysisPanel from '@/components/AnswerAnalysisPanel';
import type { AnswerVersion, AssignmentQuestion, QuestionProgress, VersionStatus } from '@/components/assignment/types';
import { MAX_VERSIONS_PER_QUESTION, formatClock } from '@/components/assignment/types';

const STATUS_LABEL: Record<VersionStatus, { text: string; className: string }> = {
  uploading: { text: 'Đang tải lên…', className: 'bg-sky-50 text-sky-800' },
  uploaded: { text: 'Chưa có transcript', className: 'bg-gray-100 text-gray-700' },
  transcribing: { text: 'Đang nhận dạng…', className: 'bg-sky-50 text-sky-800' },
  transcribed: { text: 'Transcript sẵn sàng', className: 'bg-emerald-50 text-emerald-800' },
  failed: { text: 'Lỗi — cần thử lại', className: 'bg-red-50 text-red-700' },
};

interface QuestionAnswerCardProps {
  question: AssignmentQuestion;
  progress?: QuestionProgress;
  recording: null | { secondsLeft: number; liveTranscript: string; liveSupported: boolean };
  /** Có câu khác đang ghi âm, hoặc đang nộp bài. */
  locked: boolean;
  versionsSupported: boolean;
  onRecord: () => void;
  onStop: () => void;
  onUploadFile: (file: File) => void;
  onSelect: (version: AnswerVersion) => void;
  onEditTranscript: (version: AnswerVersion, text: string) => void;
  onTranscribe: (version: AnswerVersion) => void;
}

export default function QuestionAnswerCard({
  question, progress, recording, locked, versionsSupported,
  onRecord, onStop, onUploadFile, onSelect, onEditTranscript, onTranscribe,
}: QuestionAnswerCardProps) {
  const versions = progress?.versions ?? [];
  const limitReached = versions.length >= MAX_VERSIONS_PER_QUESTION;
  const isRecording = Boolean(recording);
  // Bản mới nhất ở trên cùng.
  const ordered = [...versions].sort((a, b) => b.attemptNumber - a.attemptNumber);

  return (
    <li id={`question-${question.id}`} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">Câu {question.position}</h3>
        <span className="text-xs text-gray-500">{question.max_score} điểm · tối đa {formatClock(question.time_limit_seconds)} mỗi lần ghi</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">{question.content}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isRecording ? (
          <button type="button" onClick={onStop} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
            Dừng ghi · còn {formatClock(recording!.secondsLeft)}
          </button>
        ) : (
          <button type="button" disabled={locked || limitReached} onClick={onRecord} className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
            {versions.length ? `Ghi âm lại (bản ${versions.length + 1})` : 'Ghi âm câu trả lời'}
          </button>
        )}
        <label className={`rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 ${locked || limitReached || isRecording ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-gray-50'}`}>
          Tải tệp audio
          <input
            className="sr-only"
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
            disabled={locked || limitReached || isRecording}
            onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadFile(file); event.currentTarget.value = ''; }}
          />
        </label>
        <span className="text-xs text-gray-500">{versions.length}/{MAX_VERSIONS_PER_QUESTION} phiên bản</span>
      </div>

      {isRecording && (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50/60 p-3 text-sm" aria-live="polite">
          <p className="text-xs font-semibold text-red-700">Đang ghi âm… tự dừng khi hết thời gian của câu.</p>
          {recording!.liveSupported
            ? <p className="mt-1 whitespace-pre-wrap text-gray-800">{recording!.liveTranscript || 'Hãy bắt đầu nói, transcript tạm thời sẽ hiện ở đây.'}</p>
            : <p className="mt-1 text-xs text-gray-600">Trình duyệt không hỗ trợ transcript trực tiếp; Whisper sẽ tạo transcript sau khi dừng.</p>}
        </div>
      )}

      {ordered.length > 0 && (
        <ul className="mt-4 space-y-3" aria-label={`Các phiên bản ghi âm câu ${question.position}`}>
          {ordered.map((version) => {
            const selected = version.key === progress?.finalKey;
            // Whisper lỗi nhưng đã có transcript (nhận dạng trực tiếp / tự gõ) thì vẫn nộp được.
            const status = version.status === 'failed' && version.id && version.transcript?.trim()
              ? { text: 'Dùng transcript tạm', className: 'bg-amber-50 text-amber-900' }
              : STATUS_LABEL[version.status];
            return (
              <li key={version.key} className={`rounded-xl border p-3 ${selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {versionsSupported ? (
                    <label className={`inline-flex items-center gap-2 text-sm font-semibold ${version.id ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                      <input
                        type="radio"
                        name={`final-${question.id}`}
                        checked={selected}
                        disabled={!version.id || locked}
                        onChange={() => onSelect(version)}
                        className="h-4 w-4 accent-gray-900"
                      />
                      Bản {version.attemptNumber}
                    </label>
                  ) : <span className="text-sm font-semibold">Bản {version.attemptNumber}</span>}
                  {selected && <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-semibold text-white">Bản sẽ nộp</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.text}</span>
                  <span className="ml-auto text-[11px] text-gray-500">
                    {version.durationSeconds ? `${formatClock(version.durationSeconds)} · ` : ''}{new Date(version.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>

                {version.audioUrl && <audio controls preload="metadata" src={version.audioUrl} className="mt-2 h-9 w-full" aria-label={`Nghe lại bản ${version.attemptNumber} câu ${question.position}`} />}
                {version.error && <p className="mt-2 text-xs text-red-700">{version.error}</p>}
                {version.id && (version.status === 'uploaded' || version.status === 'failed' || version.status === 'transcribing') && (
                  <button type="button" disabled={locked} onClick={() => onTranscribe(version)} className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                    {version.status === 'transcribing' ? 'Thử nhận dạng lại' : 'Tạo transcript'}
                  </button>
                )}

                {selected && version.id ? (
                  <>
                    <label htmlFor={`transcript-${version.key}`} className="mt-3 block text-xs font-semibold text-gray-600">
                      Transcript {version.status === 'transcribed' ? '(có thể sửa lỗi nhận dạng trước khi nộp)' : version.status === 'transcribing' ? '(đang nhận dạng…)' : '(nhận dạng tự động chưa có — bạn có thể tự gõ lại nội dung đã nói)'}
                    </label>
                    <textarea
                      id={`transcript-${version.key}`}
                      value={version.transcript ?? ''}
                      disabled={locked || version.status === 'transcribing'}
                      onChange={(event) => onEditTranscript(version, event.target.value)}
                      rows={4}
                      placeholder="Nội dung câu trả lời của bạn…"
                      className={`mt-1 w-full rounded-lg border p-3 text-sm leading-6 outline-none focus:border-gray-900 disabled:bg-gray-50 ${version.transcript?.trim() ? 'border-gray-300' : 'border-amber-400'}`}
                    />
                    {version.transcript?.trim() && version.status !== 'transcribing' && <AnswerAnalysisPanel transcript={version.transcript} audioDurationSeconds={version.durationSeconds} />}
                  </>
                ) : version.transcript !== undefined && (
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">{version.transcript || 'Chưa có transcript.'}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {limitReached && <p className="mt-3 text-xs text-amber-800">Đã đạt tối đa {MAX_VERSIONS_PER_QUESTION} phiên bản — hãy chọn một bản để nộp.</p>}
    </li>
  );
}
