import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeacherClassDetail from '@/components/TeacherClassDetail';

export const metadata: Metadata = {
  title: 'Chi tiết lớp học - AIOralCheck',
  description: 'Danh sách sinh viên và thông tin khảo thí của lớp học phần.',
};

const availableClassCodes = ['AIO-8892', 'AIO-3419', 'AIO-5510', 'AIO-9012'];

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;
  if (!availableClassCodes.includes(classCode)) notFound();

  return <TeacherClassDetail classCode={classCode} />;
}
