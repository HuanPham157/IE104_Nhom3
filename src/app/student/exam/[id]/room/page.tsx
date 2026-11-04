import ExamRoom from '@/components/ExamRoom';

export const metadata = {
  title: 'Phòng thi Vấn đáp Trực tiếp - AIOralCheck',
  description: 'Phòng thi ghi âm và nhận diện giọng nói khảo thí AI thời gian thực.',
};

interface ExamRoomProps {
  params: Promise<{ id: string }>;
}

export default async function ExamRoomPage({ params }: ExamRoomProps) {
  const { id } = await params;
  return <ExamRoom examId={id} />;
}