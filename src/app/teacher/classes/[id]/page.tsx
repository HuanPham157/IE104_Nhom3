import TeacherClassDetail from '@/components/TeacherClassDetail';

export const metadata = {
  title: 'Chi tiết Lớp học & Danh sách Sinh viên | AIOralCheck Studio',
  description: 'Quản lý sinh viên, bài tập khảo thí và phân tích phổ âm thanh lớp học',
};

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeacherClassDetail classId={id} />;
}
