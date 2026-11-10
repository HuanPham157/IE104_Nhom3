import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const rubricSchema = z
  .object({
    criterion_text: z.string().trim().min(1).max(500),
    max_points: z.number().positive().max(999.99),
    position: z.number().int().positive().optional(),
  })
  .strict();
const questionSchema = z
  .object({
    content: z.string().trim().min(1).max(10000),
    reference_answer: z.string().trim().max(10000).optional().default(''),
    position: z.number().int().positive().optional(),
    max_score: z.number().positive().max(999.99).optional().default(10),
    time_limit_seconds: z.number().int().positive().max(7200).optional().default(120),
    rubric: z.array(rubricSchema).max(30).optional().default([]),
  })
  .strict()
  .refine(
    (question) =>
      question.rubric.reduce((sum, criterion) => sum + criterion.max_points, 0) <=
      question.max_score,
    'Tổng điểm rubric không được vượt điểm tối đa của câu hỏi',
  );
const assignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(10000).optional().nullable(),
    starts_at: z.string().datetime({ offset: true }).optional().nullable(),
    ends_at: z.string().datetime({ offset: true }).optional().nullable(),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .strict()
  .refine(
    (value) =>
      !value.starts_at ||
      !value.ends_at ||
      new Date(value.ends_at).getTime() > new Date(value.starts_at).getTime(),
    'Thời gian kết thúc phải sau thời gian bắt đầu',
  )
  .refine(
    (value) => Math.abs(value.questions.reduce((sum, question) => sum + question.max_score, 0) - 10) < 0.01,
    'Tổng điểm bài tập phải bằng 10',
  );

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request);
  if (!auth.ok) return auth.response;

  const { id: classId } = await context.params;
  if (!idSchema.safeParse(classId).success) {
    return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
  }

  if (auth.value.role === 'lecturer') {
    const { data: classRecord, error: classError } = await auth.value.db
      .from('classes')
      .select('status')
      .eq('id', classId)
      .maybeSingle();
    if (classError) {
      reportDatabaseError('Unable to verify class assignment access', classError);
      return apiJson({ error: 'Không thể xác minh quyền truy cập lớp' }, 500);
    }
    if (!classRecord || classRecord.status === 'pending') {
      return apiJson({ error: 'Lớp đang chờ duyệt; chưa thể truy cập bài tập' }, 403);
    }
  }

  const { data, error } = await auth.value.db
    .from('assignments')
    .select('id,class_id,lecturer_id,title,instructions,starts_at,ends_at,status,results_published_at,created_at')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) {
    reportDatabaseError('Unable to load class assignments', error);
    return apiJson({ error: 'Không thể tải bài tập' }, 500);
  }
  return apiJson({ data });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id: classId } = await context.params;
  if (!idSchema.safeParse(classId).success) {
    return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
  }

  const parsed = assignmentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Thông tin bài tập không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const { data: assignmentId, error } = await auth.value.db.rpc(
    'create_assignment_with_questions',
    {
      p_class_id: classId,
      p_assignment: parsed.data,
    },
  );

  if (error) {
    reportDatabaseError('Unable to create assignment', error);
    if (error.message.includes('Active class owned by lecturer required')) {
      return apiJson({ error: 'Không tìm thấy lớp đang hoạt động hoặc bạn không có quyền truy cập' }, 404);
    }
    return apiJson({ error: 'Không thể tạo bài tập' }, 500);
  }

  const { data, error: loadError } = await auth.value.db
    .from('assignments')
    .select('id,class_id,lecturer_id,title,instructions,starts_at,ends_at,status,created_at')
    .eq('id', assignmentId)
    .single();

  if (loadError) {
    reportDatabaseError('Unable to load created assignment', loadError);
    return apiJson({ error: 'Bài tập đã tạo nhưng không thể tải lại dữ liệu' }, 500);
  }
  return apiJson({ data }, 201);
}
