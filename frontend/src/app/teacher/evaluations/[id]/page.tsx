import TeacherAssignmentSubmissions from '@/components/TeacherAssignmentSubmissions';

export const metadata = { title: 'Bài nộp sinh viên - AIOralCheck' };

export default async function TeacherAssignmentSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherAssignmentSubmissions assignmentId={id} />;
}
