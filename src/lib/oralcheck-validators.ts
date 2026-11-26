import { z } from 'zod';

export const MAX_PENDING_CLASSES_PER_LECTURER = 3;

export const uuidIdSchema = z.string().uuid();

export const createClassSchema = z
  .object({
    class_name: z
      .string()
      .trim()
      .min(1, 'Tên lớp học không được để trống')
      .max(160, 'Tên lớp học tối đa 160 ký tự'),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

export const joinClassSchema = z
  .object({
    class_code: z.string().trim().min(6).max(10).regex(/^[A-Za-z0-9]+$/),
  })
  .strict();

export const reviewSubmissionSchema = z
  .object({
    final_score: z.number().min(0).max(999.99),
    reviewer_feedback: z.string().trim().max(5000).optional().nullable(),
    score_modified: z.boolean().optional().default(false),
  })
  .strict()
  .refine(
    (value) => !value.score_modified || Boolean(value.reviewer_feedback),
    'Cần nhập nhận xét khi điều chỉnh điểm',
  );

export const durationSchema = z.coerce.number().int().positive().max(7200);
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

/** Normalize class names for case- and whitespace-insensitive uniqueness checks. */
export function normalizeClassName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export interface ExistingClassSummary {
  class_name: string;
  status: 'pending' | 'active' | 'rejected' | 'archived';
}

export type ClassCreationRuleError =
  | {
      ok: false;
      status: 409;
      code: 'DUPLICATE_CLASS_NAME' | 'MAX_PENDING_CLASSES_EXCEEDED';
      error: string;
    }
  | { ok: true };

/** Evaluate R2 (duplicate active/pending name) and R3 (max 3 pending classes for lecturers). */
export function validateTeacherClassCreationRules(
  ownedClasses: readonly ExistingClassSummary[],
  className: string,
  role: 'lecturer' | 'admin',
): ClassCreationRuleError {
  const normalizedTarget = normalizeClassName(className);
  const hasDuplicate = ownedClasses.some(
    (item) =>
      (item.status === 'pending' || item.status === 'active') &&
      normalizeClassName(item.class_name) === normalizedTarget,
  );
  if (hasDuplicate) {
    return {
      ok: false,
      status: 409,
      code: 'DUPLICATE_CLASS_NAME',
      error: 'Bạn đã có lớp học với tên này đang hoạt động hoặc chờ duyệt.',
    };
  }

  if (role === 'lecturer') {
    const pendingCount = ownedClasses.filter((item) => item.status === 'pending').length;
    if (pendingCount >= MAX_PENDING_CLASSES_PER_LECTURER) {
      return {
        ok: false,
        status: 409,
        code: 'MAX_PENDING_CLASSES_EXCEEDED',
        error: `Bạn chỉ có thể có tối đa ${MAX_PENDING_CLASSES_PER_LECTURER} lớp đang chờ quản trị viên phê duyệt cùng lúc.`,
      };
    }
  }

  return { ok: true };
}

/** Parse multiline class description metadata into structured UI fields. */
export function getClassMetadata(description: string | null, fallbackFaculty: string) {
  const lines = (description ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const secondaryCode = lines.find((line) => /^Mã môn:/i.test(line))?.replace(/^Mã môn:\s*/i, '') ?? '';
  const faculty = lines.find((line) => /^Khoa:/i.test(line))?.replace(/^Khoa:\s*/i, '') ?? fallbackFaculty;
  const schedule = lines.filter((line) => !/^(Mã môn|Khoa):/i.test(line)).join(' • ');
  return { secondaryCode, faculty, schedule };
}

/** Validate an uploaded audio MIME type and byte size. */
export function validateAudioMetadata(mimeTypeRaw: string, sizeBytes: number): {
  ok: true;
  mimeType: string;
  extension: string;
} | {
  ok: false;
  error: string;
} {
  const mimeType = mimeTypeRaw.split(';', 1)[0].trim().toLowerCase();
  if (!(mimeType in AUDIO_TYPES) || sizeBytes <= 0 || sizeBytes > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      error: 'Tệp phải là âm thanh được hỗ trợ và không vượt quá 25 MB',
    };
  }
  return { ok: true, mimeType, extension: AUDIO_TYPES[mimeType] };
}
