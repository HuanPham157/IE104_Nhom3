import type { Metadata } from 'next';
import TeacherProfile from '@/components/TeacherProfile';

export const metadata: Metadata = {
  title: 'Hồ sơ giảng viên - AIOralCheck',
  description: 'Thông tin hồ sơ cá nhân dành cho giảng viên AIOralCheck.',
};

export default function TeacherProfilePage() {
  return <TeacherProfile />;
}
