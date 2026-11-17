import DeferredFeatureNotice from '@/components/DeferredFeatureNotice';

export const metadata = {
  title: 'Kiểm tra thiết bị & Quy chế thi - AIOralCheck',
  description: 'Hiệu chuẩn âm học và webcam trước khi làm bài thi vấn đáp.',
};

export default function StudentExamPage() {
  return (
    <DeferredFeatureNotice
      title="Kiểm tra thiết bị và quy chế"
      description="Kiểm tra camera, microphone và quy trình thi chưa được bật trong giai đoạn này."
      backHref="/student/classes"
      backLabel="Quay lại lớp học"
    />
  );
}