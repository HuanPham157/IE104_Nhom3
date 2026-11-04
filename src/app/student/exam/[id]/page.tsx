import ExamCheck from '@/components/ExamCheck';

export const metadata = {
  title: 'Kiểm tra thiết bị & Quy chế thi - AIOralCheck',
  description: 'Hiệu chuẩn âm học và webcam trước khi làm bài thi vấn đáp.',
};

interface ExamPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentExamPage({ params }: ExamPageProps) {
  const { id } = await params;
  return <ExamCheck examId={id} />;
}