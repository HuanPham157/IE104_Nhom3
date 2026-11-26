import { describe, expect, it } from 'vitest';
import { getProfileRole } from '@/lib/auth-request';
import {
  createClassSchema,
  durationSchema,
  getClassMetadata,
  joinClassSchema,
  reviewSubmissionSchema,
  validateAudioMetadata,
  validateTeacherClassCreationRules,
} from '@/lib/oralcheck-validators';

describe('Unit Tests — OralCheck Pure Validators & Business Rules', () => {
  it('UT-01: createClassSchema kiểm tra giá trị biên tên lớp (0, 1, 160, 161 ký tự)', () => {
    expect(createClassSchema.safeParse({ class_name: '   ' }).success).toBe(false);
    expect(createClassSchema.safeParse({ class_name: 'A' }).success).toBe(true);
    expect(createClassSchema.safeParse({ class_name: 'K'.repeat(160) }).success).toBe(true);
    expect(createClassSchema.safeParse({ class_name: 'K'.repeat(161) }).success).toBe(false);
  });

  it('UT-02: validateTeacherClassCreationRules thực thi R2 (trùng tên) và R3 (tối đa 3 lớp pending)', () => {
    const existing = [
      { class_name: 'IE104 - Web', status: 'active' as const },
      { class_name: 'SE104 - CNPM', status: 'pending' as const },
      { class_name: 'CS112 - Thuật toán', status: 'pending' as const },
      { class_name: 'NT106 - Mạng', status: 'rejected' as const },
    ];

    // Trùng tên (không phân biệt hoa/thường & khoảng trắng) -> R2 chặn 409
    const dupResult = validateTeacherClassCreationRules(existing, '  ie104 - web ', 'lecturer');
    expect(dupResult).toMatchObject({ ok: false, status: 409, code: 'DUPLICATE_CLASS_NAME' });

    // Tên lớp cũ từng bị rejected -> được phép mở lại
    const retryRejected = validateTeacherClassCreationRules(existing, 'NT106 - Mạng', 'lecturer');
    expect(retryRejected).toEqual({ ok: true });

    // Đủ 3 lớp pending -> giảng viên bị chặn theo R3, admin vẫn được tạo
    const threePending = [
      { class_name: 'Lop 1', status: 'pending' as const },
      { class_name: 'Lop 2', status: 'pending' as const },
      { class_name: 'Lop 3', status: 'pending' as const },
    ];
    expect(validateTeacherClassCreationRules(threePending, 'Lop 4', 'lecturer')).toMatchObject({
      ok: false,
      status: 409,
      code: 'MAX_PENDING_CLASSES_EXCEEDED',
    });
    expect(validateTeacherClassCreationRules(threePending, 'Lop 4', 'admin')).toEqual({ ok: true });
  });

  it('UT-03: joinClassSchema kiểm tra giá trị biên mã lớp (5, 6, 10, 11 ký tự & ký tự đặc biệt)', () => {
    expect(joinClassSchema.safeParse({ class_code: 'AB123' }).success).toBe(false);
    expect(joinClassSchema.safeParse({ class_code: 'ab12cd' }).success).toBe(true);
    expect(joinClassSchema.safeParse({ class_code: 'A1B2C3D4E5' }).success).toBe(true);
    expect(joinClassSchema.safeParse({ class_code: 'A1B2C3D4E5F' }).success).toBe(false);
    expect(joinClassSchema.safeParse({ class_code: 'AB-1234' }).success).toBe(false);
  });

  it('UT-04: reviewSubmissionSchema kiểm tra biên điểm số (0..999.99) và quy tắc bắt buộc nhận xét khi sửa điểm', () => {
    expect(reviewSubmissionSchema.safeParse({ final_score: -0.01 }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ final_score: 0 }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ final_score: 999.99 }).success).toBe(true);
    expect(reviewSubmissionSchema.safeParse({ final_score: 1000 }).success).toBe(false);

    // Sửa điểm (score_modified=true) nhưng không có nhận xét hoặc chỉ có khoảng trắng -> lỗi
    const noFeedback = reviewSubmissionSchema.safeParse({
      final_score: 8.5,
      score_modified: true,
      reviewer_feedback: '   ',
    });
    expect(noFeedback.success).toBe(false);

    // Có nhận xét hợp lệ -> pass
    const withFeedback = reviewSubmissionSchema.safeParse({
      final_score: 8.5,
      score_modified: true,
      reviewer_feedback: 'Sinh viên trả lời đủ 3 ý chính.',
    });
    expect(withFeedback.success).toBe(true);
  });

  it('UT-05: validateAudioMetadata và durationSchema kiểm tra định dạng âm thanh, kích thước và thời lượng', () => {
    expect(validateAudioMetadata('audio/webm;codecs=opus', 1024)).toEqual({
      ok: true,
      mimeType: 'audio/webm',
      extension: 'webm',
    });
    expect(validateAudioMetadata('application/pdf', 1024).ok).toBe(false);
    expect(validateAudioMetadata('audio/wav', 0).ok).toBe(false);
    expect(validateAudioMetadata('audio/wav', 25 * 1024 * 1024 + 1).ok).toBe(false);

    expect(durationSchema.safeParse(0).success).toBe(false);
    expect(durationSchema.safeParse(1).success).toBe(true);
    expect(durationSchema.safeParse(7200).success).toBe(true);
    expect(durationSchema.safeParse(7201).success).toBe(false);
  });

  it('UT-06: getClassMetadata bóc tách đúng Mã môn, Khoa, Phòng và Lịch học từ description', () => {
    const parsed = getClassMetadata(
      'Mã môn: SE104\nKhoa: Khoa Công nghệ Phần mềm\nPhòng: C302\nLịch: Thứ 3 (7h30)',
      'Khoa mặc định',
    );
    expect(parsed).toEqual({
      secondaryCode: 'SE104',
      faculty: 'Khoa Công nghệ Phần mềm',
      schedule: 'Phòng: C302 • Lịch: Thứ 3 (7h30)',
    });

    expect(getClassMetadata(null, 'Khoa Hệ thống Thông tin')).toEqual({
      secondaryCode: '',
      faculty: 'Khoa Hệ thống Thông tin',
      schedule: '',
    });
  });

  it('UT-07: getProfileRole ánh xạ đúng role và chặn tài khoản pending/suspended', async () => {
    const createMockDb = (row: { role: string; account_status: string } | null) =>
      ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: row, error: null }),
            }),
          }),
        }),
      }) as unknown as Parameters<typeof getProfileRole>[0];

    await expect(
      getProfileRole(createMockDb({ role: 'lecturer', account_status: 'active' }), 'u1'),
    ).resolves.toEqual({ role: 'teacher', error: null });

    await expect(
      getProfileRole(createMockDb({ role: 'student', account_status: 'active' }), 'u2'),
    ).resolves.toEqual({ role: 'student', error: null });

    await expect(
      getProfileRole(createMockDb({ role: 'lecturer', account_status: 'suspended' }), 'u3'),
    ).resolves.toEqual({ role: null, error: null });
  });
});
