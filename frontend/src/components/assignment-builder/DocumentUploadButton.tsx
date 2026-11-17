'use client';

import { useState } from 'react';
import { ACCEPTED_DOCUMENT_TYPES, readDocumentText } from '@/lib/document-text';

/** Nút tải file .docx/.txt/.md, đọc văn bản ngay trên trình duyệt rồi trả về qua onText. */
export default function DocumentUploadButton({ label, disabled, onText, onError }: {
  label: string;
  disabled?: boolean;
  onText: (text: string, fileName: string) => void;
  onError: (message: string) => void;
}) {
  const [reading, setReading] = useState(false);
  return (
    <label className={`inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 ${disabled || reading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>
      {reading ? 'Đang đọc file…' : label}
      <input
        type="file"
        className="sr-only"
        accept={ACCEPTED_DOCUMENT_TYPES}
        disabled={disabled || reading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          setReading(true);
          try {
            const text = await readDocumentText(file);
            if (!text) throw new Error('File không có nội dung văn bản.');
            onText(text, file.name);
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Không đọc được file.');
          } finally { setReading(false); }
        }}
      />
    </label>
  );
}
