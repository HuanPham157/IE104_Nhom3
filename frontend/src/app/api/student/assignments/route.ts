import { apiJson, authenticateRole, reportDatabaseError } from '@/lib/oralcheck-api';
import type { StudentAssignmentItem } from '@/lib/student-agenda';

/**
 * Bài tập đã công bố trong các lớp sinh viên đang tham gia, kèm trạng thái làm bài của chính sinh viên.
 * Một lần gọi thay cho "danh sách lớp + bài tập từng lớp"; dùng cho Việc cá nhân và lịch hạn nộp.
 * Truy vấn bằng client của sinh viên nên RLS quyết định dữ liệu được thấy.
 */
export async function GET(request: Request) {
  const auth = await authenticateRole(request, ['student']);
  if (!auth.ok) return auth.response;
  const { db, user } = auth.value;

  const { data: memberships, error: membershipError } = await db
    .from('class_members')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('status', 'active');
  if (membershipError) {
    reportDatabaseError('Unable to load student memberships for agenda', membershipError);
    return apiJson({ error: 'Không thể tải lớp học' }, 500);
  }
  const memberClassIds = memberships.map((membership) => membership.class_id);
  if (!memberClassIds.length) return apiJson({ data: [] });

  const { data: classes, error: classError } = await db
    .from('classes')
    .select('id,class_name,class_code')
    .in('id', memberClassIds)
    .eq('status', 'active');
  if (classError) {
    reportDatabaseError('Unable to load student classes for agenda', classError);
    return apiJson({ error: 'Không thể tải lớp học' }, 500);
  }
  if (!classes.length) return apiJson({ data: [] });

  const [assignmentsResult, attemptsResult] = await Promise.all([
    db.from('assignments')
      .select('id,class_id,title,starts_at,ends_at,duration_minutes,results_published_at')
      .in('class_id', classes.map((item) => item.id))
      .eq('status', 'published')
      .order('ends_at', { ascending: true, nullsFirst: false }),
    db.from('assignment_submissions')
      .select('assignment_id,status,submitted_at,started_at')
      .eq('student_id', user.id)
      .order('started_at', { ascending: true }),
  ]);
  if (assignmentsResult.error || attemptsResult.error) {
    reportDatabaseError('Unable to load student assignments for agenda', (assignmentsResult.error ?? attemptsResult.error)!);
    return apiJson({ error: 'Không thể tải bài tập' }, 500);
  }

  const classById = new Map(classes.map((item) => [item.id, item]));
  // Làm lại nhiều lần: lấy lượt đang làm, nếu không có thì lượt bắt đầu gần nhất (dữ liệu đã xếp theo started_at).
  const attemptByAssignment = new Map<string, (typeof attemptsResult.data)[number]>();
  for (const attempt of attemptsResult.data) {
    const current = attemptByAssignment.get(attempt.assignment_id);
    if (!current || current.status !== 'in_progress') attemptByAssignment.set(attempt.assignment_id, attempt);
  }
  const data: StudentAssignmentItem[] = assignmentsResult.data.map((assignment) => {
    const classItem = classById.get(assignment.class_id);
    const attempt = attemptByAssignment.get(assignment.id);
    return {
      id: assignment.id,
      title: assignment.title,
      class_id: assignment.class_id,
      class_name: classItem?.class_name ?? '',
      class_code: classItem?.class_code ?? '',
      starts_at: assignment.starts_at,
      ends_at: assignment.ends_at,
      duration_minutes: assignment.duration_minutes ?? null,
      results_published: Boolean(assignment.results_published_at),
      attempt_status: (attempt?.status as StudentAssignmentItem['attempt_status']) ?? null,
      submitted_at: attempt?.submitted_at ?? null,
    };
  });
  return apiJson({ data });
}
