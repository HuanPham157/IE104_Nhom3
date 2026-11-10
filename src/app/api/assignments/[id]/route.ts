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
const assignmentContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(10000).optional().nullable(),
    starts_at: z.string().datetime({ offset: true }).optional().nullable(),
    ends_at: z.string().datetime({ offset: true }).optional().nullable(),
    questions: z.array(z.object({
      content: z.string().trim().min(1).max(10000),
      reference_answer: z.string().trim().max(10000).optional().default(''),
      position: z.number().int().positive().optional(),
      max_score: z.number().positive().max(999.99).optional().default(10),
      time_limit_seconds: z.number().int().positive().max(7200).optional().default(120),
      rubric: z.array(rubricSchema).max(30).optional().default([]),
    }).strict().refine(
      (question) => question.rubric.reduce((sum, criterion) => sum + criterion.max_points, 0) <= question.max_score,
      'Tổng điểm tiêu chí không được vượt điểm tối đa của câu hỏi',
    )).min(1).max(100),
  })
  .strict()
  .refine(
    (value) => !value.starts_at || !value.ends_at || new Date(value.ends_at).getTime() > new Date(value.starts_at).getTime(),
    'Thời gian kết thúc phải sau thời gian bắt đầu',
  )
  .refine(
    (value) => Math.abs(value.questions.reduce((sum, question) => sum + question.max_score, 0) - 10) < 0.01,
    'Tổng điểm bài tập phải bằng 10',
  );
const statusSchema = z
  .object({ status: z.enum(['draft', 'published', 'closed', 'archived']) })
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data: assignment, error: assignmentError } = await auth.value.db
    .from('assignments')
    .select('id,class_id,lecturer_id,title,instructions,starts_at,ends_at,status,results_published_at,created_at')
    .eq('id', id)
    .maybeSingle();

  if (assignmentError) {
    reportDatabaseError('Unable to load assignment', assignmentError);
    return apiJson({ error: 'Không thể tải bài tập' }, 500);
  }
  if (!assignment) return apiJson({ error: 'Không tìm thấy bài tập' }, 404);

  const questionFields =
    'id,assignment_id,content,position,max_score,time_limit_seconds';
  const { data: questions, error: questionError } =
    auth.value.role === 'student'
      ? await auth.value.db
          .from('questions')
          .select(questionFields)
          .eq('assignment_id', id)
          .order('position')
      : await auth.value.db
          .from('lecturer_questions')
          .select(`${questionFields},reference_answer`)
          .eq('assignment_id', id)
          .order('position');

  if (questionError) {
    reportDatabaseError('Unable to load assignment questions', questionError);
    return apiJson({ error: 'Không thể tải danh sách câu hỏi' }, 500);
  }

  const questionIds = questions.map((question) => question.id);
  if (questionIds.length === 0) {
    return apiJson({ data: { ...assignment, questions: [] } });
  }

  let rubrics: Array<{
    id: string;
    question_id: string;
    criterion_text: string;
    max_points: number;
    position: number;
  }> = [];
  if (auth.value.role !== 'student') {
    const { data, error } = await auth.value.db
      .from('lecturer_rubric_criteria')
      .select('id,question_id,criterion_text,max_points,position')
      .in('question_id', questionIds)
      .order('position');

    if (error) {
      reportDatabaseError('Unable to load assignment rubrics', error);
      return apiJson({ error: 'Không thể tải rubric' }, 500);
    }
    rubrics = data;
  }

  const rubricByQuestion = new Map<string, typeof rubrics>();
  for (const rubric of rubrics) {
    const list = rubricByQuestion.get(rubric.question_id) ?? [];
    list.push(rubric);
    rubricByQuestion.set(rubric.question_id, list);
  }

  return apiJson({
    data: {
      ...assignment,
      questions: questions.map((question) => ({
        ...question,
        rubric:
          auth.value.role === 'student'
            ? undefined
            : rubricByQuestion.get(question.id) ?? [],
      })),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Trạng thái bài tập không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('set_assignment_status', {
    p_assignment_id: id,
    p_status: parsed.data.status,
  });
  if (error) {
    reportDatabaseError('Unable to update assignment status', error);
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền sửa' }, 404);
    }
    return apiJson({ error: 'Không thể cập nhật trạng thái bài tập' }, 400);
  }
  return apiJson({ data });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const parsed = assignmentContentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Thông tin bài tập không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const { data, error } = await auth.value.db.rpc('update_draft_assignment_with_questions', {
    p_assignment_id: id,
    p_assignment: parsed.data,
  });
  if (error) {
    reportDatabaseError('Unable to update draft assignment', error);
    if (error.message.includes('Draft assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bản nháp hoặc bạn không có quyền sửa' }, 404);
    }
    return apiJson({ error: 'Không thể cập nhật bản nháp. Bản đã có bài nộp có thể không còn được sửa.' }, 400);
  }
  return apiJson({ data });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID bài tập không hợp lệ' }, 400);
  }

  const { data, error } = await auth.value.db.rpc('delete_or_archive_assignment', {
    p_assignment_id: id,
  });
  if (error) {
    reportDatabaseError('Unable to delete assignment', error);
    if (error.message.includes('Assignment not found or forbidden')) {
      return apiJson({ error: 'Không tìm thấy bài tập hoặc bạn không có quyền xóa' }, 404);
    }
    return apiJson({ error: 'Không thể xóa bài tập' }, 400);
  }

  return apiJson({ data: { id, archived: data } });
}
