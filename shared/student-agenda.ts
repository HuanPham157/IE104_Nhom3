/** Bài tập đã công bố trong lớp của sinh viên (GET /api/student/assignments). */
export type StudentAssignmentItem = {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  class_code: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number | null;
  results_published: boolean;
  /** Trạng thái lượt làm của chính sinh viên: null = chưa bắt đầu. */
  attempt_status: 'in_progress' | 'submitted' | 'processing' | 'graded' | null;
  submitted_at: string | null;
};
