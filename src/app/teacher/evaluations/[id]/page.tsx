import DeferredFeatureNotice from '@/components/DeferredFeatureNotice';

export const metadata = {
  title: 'Đánh giá AI & Chấm điểm - AIOralCheck STUDIO',
  description: 'Thẩm định bài thi vấn đáp âm học AI và công bố điểm cho sinh viên.',
};

export default function TeacherEvaluationPage() {
  return (
    <DeferredFeatureNotice
      title="Đánh giá và công bố điểm"
      description="Transcript, phân tích AI và xác nhận điểm chưa được tích hợp. Bạn có thể tiếp tục quản lý lớp và bài tập."
      backHref="/teacher/classes"
      backLabel="Quay lại lớp học"
    />
  );
}