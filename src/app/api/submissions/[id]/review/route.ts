import { z } from 'zod';
import {
  apiJson,
  authenticateRole,
  readJson,
  reportDatabaseError,
} from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
const reviewSchema = z
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

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['lecturer', 'admin']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiJson({ error: 'ID câu trả lời không hợp lệ' }, 400);
  }

  const parsed = reviewSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiJson({ error: 'Điểm hoặc nhận xét không hợp lệ', details: parsed.error.flatten() }, 400);
  }

  const { data, error } = await auth.value.db.rpc('review_submission', {
    p_submission_id: id,
    p_final_score: parsed.data.final_score,
    p_reviewer_feedback: parsed.data.reviewer_feedback ?? null,
    p_score_modified: parsed.data.score_modified,
  });

  if (error) {
    reportDatabaseError('Unable to save lecturer grade review', error);
    if (error.message.includes('Submitted answer not found or forbidden')) {
      return apiJson({ error: 'Bài làm chưa được nộp hoặc bạn không phụ trách lớp này' }, 404);
    }
    return apiJson({ error: 'Không thể lưu điểm; hãy kiểm tra giới hạn điểm và nhận xét' }, 400);
  }
  return apiJson({ data });
}
