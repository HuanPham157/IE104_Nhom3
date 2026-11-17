import StudentAssignmentDetail from '@/components/StudentAssignmentDetail';

export const metadata = {
  title: 'Chi tiết bài tập | Cổng Học tập',
};

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentAssignmentDetail assignmentId={id} />;
}
