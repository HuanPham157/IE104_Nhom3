import type { Metadata } from 'next';
import TeacherClassDetail from '@/components/TeacherClassDetail';

export const metadata: Metadata = {
  title: 'Chi tiết lớp học - AIOralCheck',
  description: 'Danh sách sinh viên và thông tin khảo thí của lớp học phần.',
};

const TABS = ['roster', 'assignments', 'stats'] as const;

export default async function TeacherClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { classCode } = await params;
  const { tab } = await searchParams;
  const initialTab = TABS.find((item) => item === tab) ?? 'roster';
  return <TeacherClassDetail classId={classCode} initialTab={initialTab} />;
}
