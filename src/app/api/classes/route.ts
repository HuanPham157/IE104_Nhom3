import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const createClassSchema = z
  .object({
    class_name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .strict();

interface ClassListRecord {
  id: string;
  lecturer_id: string;
  class_name: string;
  description: string | null;
  class_code: string;
  status: 'pending' | 'active' | 'rejected' | 'archived';
  created_at: string;
  approved_at: string | null;
  lecturer_name?: string | null;
}

function isLecturerNameRecord(value: unknown): value is { class_id: string; lecturer_name: string | null } {
  return typeof value === 'object'
    && value !== null
    && 'class_id' in value
    && typeof value.class_id === 'string'
    && 'lecturer_name' in value
    && (typeof value.lecturer_name === 'string' || value.lecturer_name === null);
}

async function includeLecturerNames(
  db: SupabaseClient,
  classes: ClassListRecord[],
): Promise<{ data: ClassListRecord[]; error: null } | { data: null; error: unknown }> {
  if (classes.length === 0) {
    return { data: classes.map((item) => ({ ...item, lecturer_name: null })), error: null };
  }

  const { data: lecturers, error } = await db.rpc('class_lecturer_names', {
    p_class_ids: classes.map((item) => item.id),
  });
  if (error) return { data: null, error };

  const rows: unknown[] = Array.isArray(lecturers) ? lecturers : [];
  const namesById = new Map<string, string | null>();
  for (const lecturer of rows) {
    if (isLecturerNameRecord(lecturer)) namesById.set(lecturer.class_id, lecturer.lecturer_name);
  }
  return {
    data: classes.map((item) => ({
      ...item,
      lecturer_name: namesById.get(item.id) ?? null,
    })),
    error: null,
  };
}

export async function GET(request: Request) {
  const auth = await authenticateRole(request);
  if (!auth.ok) return auth.response;

  if (auth.value.role === 'student') {
    const { data: memberships, error: membershipError } = await auth.value.db
      .from('class_members')
      .select('class_id')
      .eq('student_id', auth.value.user.id)
      .eq('status', 'active');

    if (membershipError) {
      reportDatabaseError('Unable to load student classes', membershipError);
      return apiJson({ error: 'Không thể tải lớp học' }, 500);
    }

    const classIds = memberships.map((membership) => membership.class_id);
    if (classIds.length === 0) return apiJson({ data: [] });

    const { data, error } = await auth.value.db
      .from('classes')
      .select('id,lecturer_id,class_name,description,class_code,status,created_at,approved_at')
      .in('id', classIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      reportDatabaseError('Unable to load student classes', error);
      return apiJson({ error: 'Không thể tải lớp học' }, 500);
    }
    const dataWithLecturerNames = await includeLecturerNames(auth.value.db, data);
    if (dataWithLecturerNames.error) {
      reportDatabaseError('Unable to load class lecturers', dataWithLecturerNames.error);
      return apiJson({ error: 'Không thể tải giảng viên phụ trách' }, 500);
    }
    return apiJson({ data: dataWithLecturerNames.data });
  }

  let query = auth.value.db
    .from('classes')
    .select('id,lecturer_id,class_name,description,class_code,status,created_at,approved_at')
    .order('created_at', { ascending: false });
  if (auth.value.role === 'lecturer') {
    query = query.eq('lecturer_id', auth.value.user.id).neq('status', 'rejected');
  } else {
    query = query.neq('status', 'rejected');
  }

  const { data, error } = await query;
  if (error) {
    reportDatabaseError('Unable to load classes', error);
    return apiJson({ error: 'Không thể tải lớp học' }, 500);
  }
  const dataWithLecturerNames = await includeLecturerNames(auth.value.db, data);
  if (dataWithLecturerNames.error) {
    reportDatabaseError('Unable to load class lecturers', dataWithLecturerNames.error);
    return apiJson({ error: 'Không thể tải giảng viên phụ trách' }, 500);
  }
  return apiJson({ data: dataWithLecturerNames.data });
}

export async function POST(request: Request) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const parsed = createClassSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Thông tin lớp học không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const classCode = randomBytes(5).toString('hex').toUpperCase();
  const { data, error } = await auth.value.db.rpc('create_class_request', {
    p_class_name: parsed.data.class_name,
    p_description: parsed.data.description ?? null,
    p_class_code: classCode,
  });

  if (error) {
    reportDatabaseError('Unable to create class approval request', error);
    if (error.code === '23505') {
      return apiJson({ error: 'Mã lớp bị trùng, vui lòng thử lại' }, 409);
    }
    return apiJson({ error: 'Không thể tạo yêu cầu mở lớp' }, 500);
  }

  const classData = data as { class: ClassListRecord; approval_request_id: string | null };
  const classWithLecturerName = await includeLecturerNames(auth.value.db, [classData.class]);
  const createdClass = classWithLecturerName.data?.[0];
  if (classWithLecturerName.error || !createdClass) {
    reportDatabaseError(
      'Unable to load created class lecturer',
      classWithLecturerName.error ?? new Error('Created class was not returned after insert'),
    );
    return apiJson({ error: 'Lớp đã được tạo nhưng không thể tải người phụ trách' }, 500);
  }
  return apiJson({
    data: {
      ...classData,
      class: createdClass,
    },
  }, 201);
}
