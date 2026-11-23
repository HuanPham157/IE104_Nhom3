'use client';

import { useState } from 'react';
import DocumentUploadButton from '@/features/assignments/components/DocumentUploadButton';
import type { ParsedQuestion } from '@shared/exam-text';
import { QUESTIONS_TEMPLATE, parseQuestionsText } from '@shared/exam-text';

/** "Nhập đề nhanh": dán hoặc tải file đề, tự tách theo "Câu 1, Câu 2…" kèm dòng "Đáp án:". */
export default function QuickImportPanel({ hasExisting, onImport, onClose, onError }: {
  hasExisting: boolean;
  onImport: (questions: ParsedQuestion[], mode: 'replace' | 'append') => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const parsed = parseQuestionsText(text);

  return (
    <section className="space-y-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5" aria-label="Nhập đề nhanh">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Nhập đề nhanh</h3>
          <p className="text-[11px] text-gray-500">Mỗi câu bắt đầu bằng “Câu 1:”, “Câu 2 (3 điểm):”…; dòng “Đáp án:” là đáp án tham khảo của câu đó.</p>
        </div>
        <DocumentUploadButton label="Tải file đề (.docx/.txt)" onError={onError} onText={(content) => setText(content)} />
      </div>
      <textarea
        aria-label="Nội dung đề"
        value={text}
        rows={8}
        onChange={(event) => setText(event.target.value)}
        placeholder={QUESTIONS_TEMPLATE}
        className="w-full rounded-xl border border-gray-200 p-3 font-mono text-[12px] leading-relaxed focus:border-black focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-xs text-gray-600">{text.trim() ? `Nhận diện được ${parsed.length} câu hỏi${parsed.filter((item) => item.referenceAnswer).length ? `, ${parsed.filter((item) => item.referenceAnswer).length} câu có đáp án` : ''}.` : 'Dán đề hoặc tải file để xem trước.'}</span>
        {hasExisting && <button type="button" disabled={!parsed.length} onClick={() => onImport(parsed, 'append')} className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Thêm vào cuối</button>}
        <button type="button" disabled={!parsed.length} onClick={() => onImport(parsed, 'replace')} className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{hasExisting ? 'Thay toàn bộ câu hỏi' : 'Tạo câu hỏi'}</button>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">Đóng</button>
      </div>
    </section>
  );
}
