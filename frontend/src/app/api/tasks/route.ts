import { authRequest, getProfileRole } from '@/services/supabase/server';
import {
  LEGACY_TASK_FIELDS,
  MISSING_COLUMN,
  TASK_FIELDS,
  createTaskSchema,
  definedOnly,
  withTaskDefaults,
} from '@/lib/personal-tasks';

// Helper trả về JSON có cấm cache để dữ liệu luôn mới nhất
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const MIGRATION_WARNING = 'Máy chủ chưa chạy migration 008 nên chưa lưu được hạn chót, ưu tiên và ghi chú.';

// GET /api/tasks: Lấy danh sách công việc của người dùng đang đăng nhập
export async function GET(request: Request) {
  try {
    const auth = await authRequest(request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const profile = await getProfileRole(auth.db, auth.user.id);
    if (profile.error) return json({ error: 'Không thể kiểm tra quyền truy cập' }, 500);
    if (profile.role !== 'student') return json({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

    const query = (fields: string) => auth.db
      .from('tasks')
      .select(fields)
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    const { data, error } = await query(TASK_FIELDS);
    if (error?.code === MISSING_COLUMN) {
      const legacy = await query(LEGACY_TASK_FIELDS);
      if (legacy.error) return json({ error: 'Không tải được dữ liệu' }, 500);
      return json({ data: (legacy.data as unknown as Parameters<typeof withTaskDefaults>[0][]).map(withTaskDefaults), warning: MIGRATION_WARNING });
    }
    if (error) return json({ error: 'Không tải được dữ liệu' }, 500);
    return json({ data });
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}

// POST /api/tasks: Thêm công việc mới (tên bắt buộc; ghi chú, hạn chót, ưu tiên tùy chọn)
export async function POST(request: Request) {
  try {
    const auth = await authRequest(request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const profile = await getProfileRole(auth.db, auth.user.id);
    if (profile.error) return json({ error: 'Không thể kiểm tra quyền truy cập' }, 500);
    if (profile.role !== 'student') return json({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

    const body = await request.json().catch(() => null);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      const titleIssue = parsed.error.issues.some((issue) => issue.path[0] === 'title');
      return json({ error: titleIssue ? 'Tên phải có 1–120 ký tự' : 'Hạn chót, ưu tiên hoặc ghi chú không hợp lệ' }, 400);
    }

    const fields = definedOnly(parsed.data);
    const insert = (row: Record<string, unknown>, select: string) => auth.db
      .from('tasks')
      .insert({ ...row, user_id: auth.user.id })
      .select(select)
      .single();

    const { data, error } = await insert(fields, TASK_FIELDS);
    if (error?.code === MISSING_COLUMN) {
      // Chưa có migration 008: vẫn thêm được việc chỉ có tên như trước; có thêm trường mới thì báo rõ.
      if (Object.keys(fields).some((key) => key !== 'title')) return json({ error: MIGRATION_WARNING }, 503);
      const legacy = await insert({ title: fields.title }, LEGACY_TASK_FIELDS);
      if (legacy.error) return json({ error: 'Không thêm được công việc' }, 500);
      return json({ data: withTaskDefaults(legacy.data as unknown as Parameters<typeof withTaskDefaults>[0]) }, 201);
    }
    if (error) return json({ error: 'Không thêm được công việc' }, 500);
    return json({ data }, 201);
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}
