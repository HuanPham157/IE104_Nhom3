import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const joinSchema = z
  .object({
    class_code: z.string().trim().min(6).max(10).regex(/^[A-Za-z0-9]+$/),
  })
  .strict();

export async function POST(request: Request) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const parsed = joinSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Mã lớp không hợp lệ (gồm 6–10 ký tự chữ hoặc số).', code: 'INVALID_CLASS_CODE' }, 400);
  }

  const normalizedCode = parsed.data.class_code.toUpperCase();

  // R2 server-side check: reject if student is already an active member of this class.
  const { data: activeMemberships, error: membershipError } = await auth.value.db
    .from('class_members')
    .select('class_id')
    .eq('student_id', auth.value.user.id)
    .eq('status', 'active');

  if (membershipError) {
    reportDatabaseError('Unable to check existing student memberships', membershipError);
    return apiJson({ error: 'Không thể kiểm tra danh sách lớp đã tham gia' }, 500);
  }

  const activeClassIds = (activeMemberships ?? []).map((item) => item.class_id);
  if (activeClassIds.length > 0) {
    const { data: matchedJoinedClasses, error: matchedClassesError } = await auth.value.db
      .from('classes')
      .select('id, class_code')
      .in('id', activeClassIds)
      .eq('class_code', normalizedCode)
      .eq('status', 'active');

    if (matchedClassesError) {
      reportDatabaseError('Unable to inspect joined classes', matchedClassesError);
      return apiJson({ error: 'Không thể kiểm tra thông tin lớp đã tham gia' }, 500);
    }

    if ((matchedJoinedClasses ?? []).length > 0) {
      return apiJson(
        {
          error: 'Bạn đã tham gia lớp học này trước đó.',
          code: 'ALREADY_JOINED',
        },
        409,
      );
    }
  }

  const { data, error } = await auth.value.db.rpc('join_class_by_code', {
    p_class_code: normalizedCode,
  });

  if (error) {
    reportDatabaseError('Unable to join class', error);
    if (
      error.message.includes('Already joined this class') ||
      error.message.includes('Student already joined this class') ||
      error.code === '23505'
    ) {
      return apiJson(
        {
          error: 'Bạn đã tham gia lớp học này trước đó.',
          code: 'ALREADY_JOINED',
        },
        409,
      );
    }
    if (error.message.includes('Class is not active')) {
      return apiJson(
        {
          error: 'Lớp học này chưa được phê duyệt hoặc đã ngừng hoạt động.',
          code: 'CLASS_NOT_ACTIVE',
        },
        409,
      );
    }
    if (error.message.includes('Active class code not found')) {
      return apiJson(
        {
          error: 'Không tìm thấy lớp đang hoạt động với mã này.',
          code: 'CLASS_NOT_FOUND',
        },
        404,
      );
    }
    return apiJson({ error: 'Không thể tham gia lớp học' }, 500);
  }

  return apiJson({ data: { class_id: data, class_code: normalizedCode } }, 201);
}
