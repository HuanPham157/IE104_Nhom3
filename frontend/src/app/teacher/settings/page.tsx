import type { Metadata } from 'next';
import TeacherSettings from '@/components/TeacherSettings';

export const metadata: Metadata = {
  title: 'Cài đặt giảng viên - AIOralCheck',
  description: 'Quản lý hồ sơ, bảo mật tài khoản và thiết bị âm thanh dành cho giảng viên.',
};

export default function TeacherSettingsPage() {
  return <TeacherSettings />;
}
