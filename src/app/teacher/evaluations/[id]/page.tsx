import TeacherEvaluation from '@/components/TeacherEvaluation';

export const metadata = {
  title: 'Đánh giá AI & Chấm điểm - AIOralCheck STUDIO',
  description: 'Thẩm định bài thi vấn đáp âm học AI và công bố điểm cho sinh viên.',
};

interface TeacherEvaluationPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherEvaluationPage({ params }: TeacherEvaluationPageProps) {
  const { id } = await params;
  return <TeacherEvaluation examId={id} />;
}