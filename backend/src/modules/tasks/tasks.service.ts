import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { LEGACY_TASK_FIELDS, MISSING_COLUMN, TASK_FIELDS, createTaskSchema, definedOnly, withTaskDefaults } from '../../common/lib/personal-tasks';

const MIGRATION_WARNING = 'Database chưa có cột mở rộng của bảng tasks (chạy lại 01_tables.sql) nên chưa lưu được hạn chót, ưu tiên và ghi chú.';

/** Chuyển từ frontend/src/app/api/tasks/route.ts. */
@Injectable()
export class TasksService {
  // GET /api/tasks: Lấy danh sách công việc của người dùng đang đăng nhập
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    try {
      if (auth.role !== 'student') return apiJson({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

      const query = (fields: string) => auth.db
        .from('tasks')
        .select(fields)
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false });

      const { data, error } = await query(TASK_FIELDS);
      if (error?.code === MISSING_COLUMN) {
        const legacy = await query(LEGACY_TASK_FIELDS);
        if (legacy.error) return apiJson({ error: 'Không tải được dữ liệu' }, 500);
        return apiJson({ data: (legacy.data as unknown as Parameters<typeof withTaskDefaults>[0][]).map(withTaskDefaults), warning: MIGRATION_WARNING });
      }
      if (error) return apiJson({ error: 'Không tải được dữ liệu' }, 500);
      return apiJson({ data });
    } catch {
      return apiJson({ error: 'Lỗi hệ thống máy chủ' }, 500);
    }
  }

  // POST /api/tasks: Thêm công việc mới (tên bắt buộc; ghi chú, hạn chót, ưu tiên tùy chọn)
  async create(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    try {
      if (auth.role !== 'student') return apiJson({ error: 'Chỉ sinh viên mới được quản lý công việc' }, 403);

      const parsed = createTaskSchema.safeParse(body);
      if (!parsed.success) {
        const titleIssue = parsed.error.issues.some((issue) => issue.path[0] === 'title');
        return apiJson({ error: titleIssue ? 'Tên phải có 1–120 ký tự' : 'Hạn chót, ưu tiên hoặc ghi chú không hợp lệ' }, 400);
      }

      const fields = definedOnly(parsed.data);
      const insert = (row: Record<string, unknown>, select: string) => auth.db
        .from('tasks')
        .insert({ ...row, user_id: auth.userId })
        .select(select)
        .single();

      const { data, error } = await insert(fields, TASK_FIELDS);
      if (error?.code === MISSING_COLUMN) {
        // Chưa có migration 008: vẫn thêm được việc chỉ có tên như trước; có thêm trường mới thì báo rõ.
        if (Object.keys(fields).some((key) => key !== 'title')) return apiJson({ error: MIGRATION_WARNING }, 503);
        const legacy = await insert({ title: fields.title }, LEGACY_TASK_FIELDS);
        if (legacy.error) return apiJson({ error: 'Không thêm được công việc' }, 500);
        return apiJson({ data: withTaskDefaults(legacy.data as unknown as Parameters<typeof withTaskDefaults>[0]) }, 201);
      }
      if (error) return apiJson({ error: 'Không thêm được công việc' }, 500);
      return apiJson({ data }, 201);
    } catch {
      return apiJson({ error: 'Lỗi hệ thống máy chủ' }, 500);
    }
  }
}
