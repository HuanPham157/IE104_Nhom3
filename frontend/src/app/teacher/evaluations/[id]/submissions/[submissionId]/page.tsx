import TeacherSubmissionReview from '@/components/TeacherSubmissionReview';

export const metadata = { title: 'Duyệt bài làm - AIOralCheck' };

export default async function TeacherSubmissionReviewPage({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  return <TeacherSubmissionReview assignmentId={id} submissionId={submissionId} />;
}
