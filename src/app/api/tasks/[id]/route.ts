import { z } from 'zod';
import { authRequest } from '@/lib/auth-request';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const idSchema = z.string().uuid();

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    is_done: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.is_done !== undefined,
    { message: 'Yêu cầu ít nhất một trường title hoặc is_done' }
  );

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/tasks/:id : Cập nhật tiêu đề hoặc trạng thái hoàn thành
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const { id } = await context.params;
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return json({ error: 'ID công việc không hợp lệ' }, 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Dữ liệu cập nhật không hợp lệ' }, 400);
    }

    const updateData: { title?: string; is_done?: boolean } = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.is_done !== undefined) updateData.is_done = parsed.data.is_done;

    // Chỉ update dòng vừa khớp ID vừa khớp user_id của chính người gọi
    const { data, error } = await auth.db
      .from('tasks')
      .update(updateData)
      .eq('id', idParsed.data)
      .eq('user_id', auth.user.id)
      .select('id,title,is_done,created_at')
      .maybeSingle();

    if (error) {
      return json({ error: 'Không thể cập nhật công việc' }, 500);
    }

    if (!data) {
      return json({ error: 'Không tìm thấy công việc hoặc không có quyền' }, 404);
    }

    return json({ data });
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}

// DELETE /api/tasks/:id : Xóa công việc
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const { id } = await context.params;
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return json({ error: 'ID công việc không hợp lệ' }, 400);
    }

    // Chỉ delete dòng thuộc sở hữu của user
    const { data, error } = await auth.db
      .from('tasks')
      .delete()
      .eq('id', idParsed.data)
      .eq('user_id', auth.user.id)
      .select('id');

    if (error) {
      return json({ error: 'Không thể xóa công việc' }, 500);
    }

    if (!data || data.length === 0) {
      return json({ error: 'Không tìm thấy công việc hoặc không có quyền' }, 404);
    }

    return json({ data: { id: idParsed.data } });
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}