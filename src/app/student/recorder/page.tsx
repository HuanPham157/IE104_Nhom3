import StudentRecorder from '@/components/StudentRecorder';

export const metadata = {
  title: 'Kiểm tra thiết bị phòng thi - AIOralCheck',
  description: 'Kiểm tra webcam, microphone và xác nhận quy chế phòng thi dành cho sinh viên.',
};

export default function StudentRecorderPage() {
  return <StudentRecorder />;
}
