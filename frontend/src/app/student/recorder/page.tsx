import StudentRecorder from '@/features/exam/components/StudentRecorder';

export const metadata = {
  title: 'Thử micro - AIOralCheck',
  description: 'Ghi thử và kiểm tra chất lượng micro trước khi làm bài vấn đáp.',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StudentRecorderPage({ searchParams }: { searchParams: Promise<{ assignmentId?: string | string[] }> }) {
  const { assignmentId } = await searchParams;
  const returnAssignmentId = typeof assignmentId === 'string' && UUID_PATTERN.test(assignmentId) ? assignmentId : undefined;
  return <StudentRecorder assignmentId={returnAssignmentId} />;
}
