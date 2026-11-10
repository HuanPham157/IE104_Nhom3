import DeferredFeatureNotice from '@/components/DeferredFeatureNotice';

export const metadata = {
  title: 'Phòng thi Vấn đáp Trực tiếp - AIOralCheck',
  description: 'Phòng thi ghi âm và nhận diện giọng nói khảo thí AI thời gian thực.',
};

export default function ExamRoomPage() {
  return (
    <DeferredFeatureNotice
      title="Phòng thi vấn đáp"
      description="Phòng ghi âm, giám sát và nhận diện giọng nói chưa được tích hợp."
      backHref="/student/classes"
      backLabel="Quay lại lớp học"
    />
  );
}