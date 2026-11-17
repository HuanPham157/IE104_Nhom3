import { z } from 'zod';
import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';

const idSchema = z.string().uuid();
type RouteContext = { params: Promise<{ id: string }> };

/** Chọn một phiên bản ghi âm làm bản nộp chính thức cho câu hỏi. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiJson({ error: 'ID phiên bản không hợp lệ' }, 400);

  const { error } = await auth.value.db.rpc('select_final_answer_version', { p_submission_id: id });
  if (error) {
    reportDatabaseError('Unable to select final answer version', error);
    if (error.code === 'PGRST202') {
      return apiJson({ error: 'Máy chủ chưa chạy supabase/seed.sql và migration 006 để hỗ trợ nhiều phiên bản.' }, 503);
    }
    return apiJson({ error: 'Không thể chọn phiên bản này: bài đã nộp hoặc đã hết giờ' }, 409);
  }
  return apiJson({ data: { id, is_final: true } });
}
