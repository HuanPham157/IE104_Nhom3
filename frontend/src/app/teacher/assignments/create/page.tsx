import TeacherQuestionBuilder from '@/components/TeacherQuestionBuilder';

export const metadata = {
  title: 'Soạn bài tập | AIOralCheck Studio',
  description: 'Tạo bài tập, câu hỏi, tiêu chí tham khảo và hạn nộp cho lớp học.',
};

export default function CreateAssignmentPage() {
  return <TeacherQuestionBuilder />;
}
