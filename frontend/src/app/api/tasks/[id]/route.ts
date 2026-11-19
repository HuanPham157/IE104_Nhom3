import { z } from 'zod';
import { authRequest, getProfileRole } from '@/services/supabase/server';
import {
  LEGACY_TASK_FIELDS,
  MISSING_COLUMN,
  TASK_FIELDS,
  definedOnly,
  updateTaskSchema,
  withTaskDefaults,
} from '@/lib/personal-tasks';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const idSchema = z.string().uuid();

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/tasks/:id : Cập nhật tên, ghi chú, hạn chót, ưu tiên hoặc trạng thái hoàn thành
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await authRequest(request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const profile = await getProfileRole(auth.db, auth.user.id);
    if (profile.error) return json({ error: 'Không thể kiểm tra quyền truy cập' }, 500);
    if (profile.role !== 'student') return json({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

    const { id } = await context.params;
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) {
      return json({ error: 'ID công việc không hợp lệ' }, 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Dữ liệu cập nhật không hợp lệ' }, 400);
    }

    const updateData = definedOnly(parsed.data);
    // Chỉ update dòng vừa khớp ID vừa khớp user_id của chính người gọi
    const update = (row: Record<string, unknown>, select: string) => auth.db
      .from('tasks')
      .update(row)
      .eq('id', idParsed.data)
      .eq('user_id', auth.user.id)
      .select(select)
      .maybeSingle();

    let { data, error } = await update(updateData, TASK_FIELDS);
    if (error?.code === MISSING_COLUMN) {
      // Chưa có migration 008: chỉ sửa được tên và trạng thái như trước.
      if (Object.keys(updateData).some((key) => key !== 'title' && key !== 'is_done')) {
        return json({ error: 'Máy chủ chưa chạy migration 008 nên chưa lưu được hạn chót, ưu tiên và ghi chú.' }, 503);
      }
      const legacy = await update(updateData, LEGACY_TASK_FIELDS);
      error = legacy.error;
      data = legacy.data ? withTaskDefaults(legacy.data as unknown as Parameters<typeof withTaskDefaults>[0]) as unknown as typeof data : null;
    }

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
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const profile = await getProfileRole(auth.db, auth.user.id);
    if (profile.error) return json({ error: 'Không thể kiểm tra quyền truy cập' }, 500);
    if (profile.role !== 'student') return json({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

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