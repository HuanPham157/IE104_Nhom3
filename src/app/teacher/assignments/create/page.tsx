import TeacherQuestionBuilder from '@/components/TeacherQuestionBuilder';

export const metadata = {
  title: 'Cấu hình Đề thi & Barem LLM | OralEval IE104',
  description: 'Giao diện Giảng viên soạn đề thi vấn đáp âm học và cấu hình rubric chấm điểm AI',
};

export default function CreateAssignmentPage() {
  return <TeacherQuestionBuilder />;
}
