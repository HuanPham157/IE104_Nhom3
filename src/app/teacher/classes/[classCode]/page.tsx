import type { Metadata } from 'next';
import TeacherClassDetail from '@/components/TeacherClassDetail';

export const metadata: Metadata = {
  title: 'Chi tiết lớp học - AIOralCheck',
  description: 'Danh sách sinh viên và thông tin khảo thí của lớp học phần.',
};

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  return <TeacherClassDetail classId={classCode} />;
}
