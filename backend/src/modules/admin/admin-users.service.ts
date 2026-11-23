import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

export type AdminUserRecord = {
  id: string;
  full_name: string;
  role: 'student' | 'lecturer' | 'admin';
  account_status: 'active' | 'pending' | 'suspended';
  created_at: string;
  email: string | null;
  identifier: string | null;
  department: string | null;
  academic_title: string | null;
};

/** Chuyển từ frontend/src/app/api/admin/users/route.ts. */
@Injectable()
export class AdminUsersService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Danh sách tài khoản cho admin (email lấy từ Supabase Auth nếu máy chủ có secret key). */
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {
    const { db } = auth;

    const [usersResult, studentsResult, lecturersResult] = await Promise.all([
      db.from('users').select('id,full_name,role,account_status,created_at').order('created_at', { ascending: false }),
      db.from('student_profiles').select('user_id,student_code,department'),
      db.from('lecturer_profiles').select('user_id,lecturer_code,department,academic_title,academic_degree'),
    ]);
    const failed = usersResult.error ?? studentsResult.error ?? lecturersResult.error;
    if (failed) {
      reportDatabaseError('Unable to load users for admin', failed);
      return apiJson({ error: 'Không thể tải danh sách tài khoản' }, 500);
    }

    const emailById = new Map<string, string>();
    try {
      const service = this.supabase.service();
      for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        data.users.forEach((user) => { if (user.email) emailById.set(user.id, user.email); });
        if (data.users.length < 1000) break;
      }
    } catch {
      // Không có secret key: vẫn trả danh sách, chỉ thiếu email.
    }

    const studentById = new Map((studentsResult.data ?? []).map((item) => [item.user_id, item]));
    const lecturerById = new Map((lecturersResult.data ?? []).map((item) => [item.user_id, item]));
    const data: AdminUserRecord[] = (usersResult.data ?? []).map((user) => {
      const student = studentById.get(user.id);
      const lecturer = lecturerById.get(user.id);
      return {
        ...user,
        email: emailById.get(user.id) ?? null,
        identifier: student?.student_code ?? lecturer?.lecturer_code ?? null,
        department: student?.department ?? lecturer?.department ?? null,
        academic_title: lecturer?.academic_title ?? lecturer?.academic_degree ?? null,
      } as AdminUserRecord;
    });
    return apiJson({ data });
  }
}
