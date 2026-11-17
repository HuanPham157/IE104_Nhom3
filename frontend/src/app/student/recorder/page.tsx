import DeferredFeatureNotice from '@/components/DeferredFeatureNotice';

export const metadata = {
  title: 'Kiểm tra thiết bị phòng thi - AIOralCheck',
  description: 'Kiểm tra webcam, microphone và xác nhận quy chế phòng thi dành cho sinh viên.',
};

export default function StudentRecorderPage() {
  return (
    <DeferredFeatureNotice
      title="Ghi âm câu trả lời"
      description="Ghi âm, camera và nhận diện giọng nói đang được tạm hoãn. Bạn vẫn có thể xem lớp học và bài tập đã được công bố."
      backHref="/student/classes"
      backLabel="Xem lớp học"
    />
  );
}
