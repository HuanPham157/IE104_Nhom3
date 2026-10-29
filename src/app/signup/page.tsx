import type { Metadata } from 'next';
import Signup from '@/components/Signup';

export const metadata: Metadata = {
  title: 'Đăng ký tài khoản - AIOralCheck',
  description: 'Đăng ký tài khoản học sinh hoặc giảng viên AIOralCheck.',
};

export default function SignupPage() {
  return <Signup />;
}
