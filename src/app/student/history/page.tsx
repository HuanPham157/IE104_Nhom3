import DeferredFeatureNotice from '@/components/DeferredFeatureNotice';

export default function StudentHistoryPage() {
  return (
    <DeferredFeatureNotice
      title="Lịch sử bài nộp"
      description="Lịch sử transcript, bản ghi âm và điểm AI chưa được tích hợp. Kết quả sẽ xuất hiện khi luồng nộp bài và công bố điểm hoàn tất."
      backHref="/student/classes"
      backLabel="Quay lại lớp học"
    />
  );
}
