import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth.types';
import { apiJson, type ApiResult } from '../../common/http/api-result';
import type { RouteParams, RouteQuery } from '../../common/http/route-types';
import { reportDatabaseError } from '../../common/http/validation';

const idSchema = z.string().uuid();
const removeMemberSchema = z.object({ student_id: z.string().uuid() }).strict();

/** Chuyển từ frontend/src/app/api/classes/[id]/members/route.ts. */
@Injectable()
export class ClassMembersService {
  async list(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id: classId } = params;
    if (!idSchema.safeParse(classId).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    const { data: classRecord, error: classError } = await auth.db
      .from('classes')
      .select('id,status')
      .eq('id', classId)
      .maybeSingle();
    if (classError) {
      reportDatabaseError('Unable to verify class roster access', classError);
      return apiJson({ error: 'Không thể xác minh quyền xem danh sách lớp' }, 500);
    }
    if (!classRecord) return apiJson({ error: 'Không tìm thấy lớp học hoặc bạn không có quyền truy cập' }, 404);
    if (auth.role === 'lecturer' && classRecord.status === 'pending') {
      return apiJson({ error: 'Lớp đang chờ duyệt; chưa thể truy cập danh sách sinh viên' }, 403);
    }

    const { data: memberships, error: membershipError } = await auth.db
      .from('class_members')
      .select('student_id,status,joined_at')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true });

    if (membershipError) {
      reportDatabaseError('Unable to load class roster', membershipError);
      return apiJson({ error: 'Không thể tải danh sách sinh viên' }, 500);
    }
    if (memberships.length === 0) return apiJson({ data: [] });

    const studentIds = memberships.map((member) => member.student_id);
    const [{ data: users, error: userError }, { data: profiles, error: profileError }] =
      await Promise.all([
        auth.db.from('users').select('id,full_name').in('id', studentIds),
        auth.db.from('student_profiles').select('user_id,student_code,department').in('user_id', studentIds),
      ]);

    if (userError || profileError) {
      reportDatabaseError('Unable to load class roster profiles', userError ?? profileError!);
      return apiJson({ error: 'Không thể tải hồ sơ sinh viên' }, 500);
    }

    const userById = new Map(users.map((user) => [user.id, user]));
    const profileById = new Map(profiles.map((profile) => [profile.user_id, profile]));
    return apiJson({
      data: memberships.map((membership) => ({
        ...membership,
        full_name: userById.get(membership.student_id)?.full_name ?? 'Sinh viên',
        student_code: profileById.get(membership.student_id)?.student_code ?? '',
        department: profileById.get(membership.student_id)?.department ?? '',
      })),
    });
  }

  async remove(auth: AuthContext, params: RouteParams, body: unknown, searchParams: RouteQuery): Promise<ApiResult> {

    const { id: classId } = params;
    if (!idSchema.safeParse(classId).success) {
      return apiJson({ error: 'ID lớp không hợp lệ' }, 400);
    }

    const parsed = removeMemberSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: 'ID sinh viên không hợp lệ' }, 400);
    }

    const { error } = await auth.db.rpc('remove_class_member', {
      p_class_id: classId,
      p_student_id: parsed.data.student_id,
    });
    if (error) {
      reportDatabaseError('Unable to remove class member', error);
      if (error.message.includes('Class member not found or forbidden')) {
        return apiJson({ error: 'Không tìm thấy sinh viên đang tham gia lớp hoặc bạn không có quyền xóa' }, 404);
      }
      return apiJson({ error: 'Không thể xóa sinh viên khỏi lớp' }, 400);
    }

    return apiJson({ data: { class_id: classId, student_id: parsed.data.student_id } });
  }
}
