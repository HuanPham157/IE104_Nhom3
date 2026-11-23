import TeacherQuestionBuilder from '@/features/assignments/components/TeacherQuestionBuilder';

export const metadata = {
  title: 'Soạn bài tập | AIOralCheck Studio',
  description: 'Tạo bài tập, câu hỏi, tiêu chí tham khảo và hạn nộp cho lớp học.',
};

export default async function CreateAssignmentPage({ searchParams }: { searchParams: Promise<{ assignmentId?: string | string[] }> }) {
  const { assignmentId } = await searchParams;
  // Dựng lại trình soạn khi đổi bài (bấm bài khác trong "Bài tập đã tạo"), vì trình soạn chỉ đọc URL lúc mở.
  return <TeacherQuestionBuilder key={typeof assignmentId === 'string' ? assignmentId : 'new'} />;
}
