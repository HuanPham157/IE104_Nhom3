import StudentClassDetail from '@/components/StudentClassDetail';

export const metadata = {
  title: 'Chi tiết Lớp học & Danh sách Bài tập | Cổng Học tập Sinh viên AIOralCheck',
  description: 'Theo dõi tiến độ bài tập vấn đáp, hạn nộp, điểm số và nhận xét chi tiết của giảng viên.',
};

export default async function StudentClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentClassDetail classId={id} />;
}
