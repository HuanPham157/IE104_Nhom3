import AdminDashboard from '@/components/AdminDashboard';

export const metadata = {
  title: 'Bảng Điều hành Quản trị viên | AIOralCheck',
  description: 'Quản lý người dùng, phê duyệt mở lớp học và giám sát tài nguyên suy luận AI',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
