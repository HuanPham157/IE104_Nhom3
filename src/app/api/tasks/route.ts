import { z } from 'zod';
import { authRequest } from '@/lib/auth-request';

// Helper trả về JSON có cấm cache để dữ liệu luôn mới nhất
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

// Schema Zod kiểm tra tên công việc từ 1 đến 120 ký tự
const inputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
  })
  .strict();

// GET /api/tasks: Lấy danh sách công việc của người dùng đang đăng nhập
export async function GET(request: Request) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const { data, error } = await auth.db
      .from('tasks')
      .select('id,title,is_done,created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) return json({ error: 'Không tải được dữ liệu' }, 500);
    return json({ data });
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}

// POST /api/tasks: Thêm công việc mới vào database
export async function POST(request: Request) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const body = await request.json().catch(() => null);
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Tên phải có 1–120 ký tự' }, 400);
    }

    const { data, error } = await auth.db
      .from('tasks')
      .insert({ title: parsed.data.title, user_id: auth.user.id })
      .select('id,title,is_done,created_at')
      .single();

    if (error) return json({ error: 'Không thêm được công việc' }, 500);
    return json({ data }, 201);
  } catch {
    return json({ error: 'Lỗi hệ thống máy chủ' }, 500);
  }
}