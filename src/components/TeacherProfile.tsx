'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/TeacherSidebar';
import { supabase } from '@/lib/supabase-browser';

export default function TeacherProfile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'degree' | 'security' | 'hsm'>('degree');

  // Teacher info
  const [fullName, setFullName] = useState('Nguyễn Văn B');
  const [academicTitle, setAcademicTitle] = useState('Th.S'); // 'Th.S' | 'TS.' | 'PGS.TS' | 'GS.TS'
  const [teacherId] = useState('GV-984210');
  const [email] = useState('b.nguyenvan@uit.edu.vn');
  const [department, setDepartment] = useState('Bộ môn Kỹ thuật Phần mềm');
  const [faculty, setFaculty] = useState('Khoa Công nghệ Phần mềm');
  const [phone, setPhone] = useState('0912.345.678');

  // Degree update request form (to Admin)
  const [requestedTitle, setRequestedTitle] = useState('TS.');
  const [degreeField, setDegreeField] = useState('Khoa học Máy tính & Trí tuệ Nhân tạo');
  const [issuingInstitution, setIssuingInstitution] = useState('Đại học Bách Khoa - ĐHQG');
  const [graduationYear, setGraduationYear] = useState('2024');
  const [decisionNumber, setDecisionNumber] = useState('QD-1042/QĐ-ĐHQG');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleDegreeRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequestSubmitted(true);
    setRequestSuccessMessage(
      `Yêu cầu nâng cấp Học hàm/Học vị lên "${requestedTitle}" đã được gửi tới Ban Quản trị viên (Admin). Trạng thái: Chờ Admin phê duyệt hồ sơ minh chứng.`
    );
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordSuccess('Đổi mật khẩu thành công!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 4000);
  }

  const fullDisplayName = `${academicTitle} ${fullName}`;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <TeacherSidebar
        currentPage="profile"
        signingOut={signingOut}
        onSignOut={handleSignOut}
      />

      <div className="md:ml-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/teacher" className="hover:text-black">
              Bàn làm việc Giảng viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Hồ sơ Cán bộ &amp; Học hàm / Học vị</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Giảng viên chính thức
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Hero Banner */}
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                  {teacherId}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  ✓ VNeID Định danh Mức 2
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {fullDisplayName}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {department} • {faculty}. Quản lý lý lịch trích ngang, chức danh khoa học và thẩm định chứng thực chữ ký số PKI Cloud HSM.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 text-right">
              <span className="text-[10px] text-gray-400 block uppercase font-bold">HỌC VỊ HIỆN TẠI</span>
              <span className="text-xl font-extrabold text-indigo-900">{academicTitle}</span>
              <span className="block text-[11px] text-gray-500">{faculty}</span>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Nav */}
            <aside className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <span className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  MỤC HỒ SƠ CÁN BỘ
                </span>
                <nav className="mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('degree')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'degree'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>1. Học hàm / Học vị &amp; Duyệt Admin</span>
                    {activeTab === 'degree' && <span className="text-[10px] text-indigo-600 font-bold">Quan trọng</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'profile'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>2. Thông tin cá nhân &amp; Lý lịch</span>
                    {activeTab === 'profile' && <span className="text-[10px] text-gray-400">Đang xem</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('security')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'security'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>3. Đổi mật khẩu &amp; Bảo mật</span>
                    {activeTab === 'security' && <span className="text-[10px] text-gray-400">Đang xem</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('hsm')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'hsm'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>4. Chữ ký số HSM Khảo thí</span>
                    {activeTab === 'hsm' && <span className="text-[10px] text-gray-400">Đang xem</span>}
                  </button>
                </nav>
              </div>

              {/* Notice Card */}
              <div className="rounded-2xl border border-indigo-200 bg-[#f4f6ff] p-4 text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-indigo-900 block mb-1">✦ Quy trình cập nhật Học vị:</span>
                Theo quy định đào tạo, sau khi Giảng viên gửi thông tin bằng cấp mới, yêu cầu sẽ được chuyển đến <b>Quản trị viên (Admin)</b> xác nhận trước khi được hiển thị chính thức trên hệ thống và đề thi oral.
              </div>
            </aside>

            {/* Right Canvas */}
            <div className="lg:col-span-8">
              {/* TAB 1: Học hàm / Học vị */}
              {activeTab === 'degree' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4 flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        1. Quản lý Học hàm / Học vị Giảng viên
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Học vị hiện tại hiển thị trên đề thi và danh sách môn học: <strong className="text-black">{academicTitle}</strong> ({fullDisplayName})
                      </p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-xs font-bold text-gray-800">
                      Cấp: Thạc sĩ
                    </span>
                  </div>

                  {requestSubmitted && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
                      ✓ {requestSuccessMessage}
                      <p className="mt-1 font-normal text-emerald-700">
                        Hệ thống đã tạo phiếu duyệt yêu cầu #REQ-ACAD-{Math.floor(1000 + Math.random() * 9000)} gửi tới Ban Giám hiệu / Quản trị viên.
                      </p>
                    </div>
                  )}

                  {/* Form to Request Degree Update */}
                  <form onSubmit={handleDegreeRequest} className="mt-5 space-y-4">
                    <div className="rounded-xl border border-indigo-100 bg-[#fafaff] p-4">
                      <span className="text-xs font-bold text-indigo-950 block mb-1">
                        Gửi yêu cầu nâng cấp Học hàm / Học vị mới (Chờ Admin duyệt)
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Điền thông tin văn bằng tốt nghiệp mới (Tiến sĩ, Thạc sĩ, PGS, GS) và đính kèm quyết định công nhận.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">
                          Học hàm / Học vị đề nghị cập nhật *
                        </label>
                        <select
                          value={requestedTitle}
                          onChange={(e) => setRequestedTitle(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-black focus:outline-none"
                        >
                          <option value="Th.S">Thạc sĩ (Th.S)</option>
                          <option value="TS.">Tiến sĩ (TS.)</option>
                          <option value="PGS. TS.">Phó Giáo sư, Tiến sĩ (PGS. TS.)</option>
                          <option value="GS. TS.">Giáo sư, Tiến sĩ (GS. TS.)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">
                          Chuyên ngành đào tạo *
                        </label>
                        <input
                          type="text"
                          required
                          value={degreeField}
                          onChange={(e) => setDegreeField(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">
                          Cơ sở cấp bằng *
                        </label>
                        <input
                          type="text"
                          required
                          value={issuingInstitution}
                          onChange={(e) => setIssuingInstitution(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">
                          Năm tốt nghiệp *
                        </label>
                        <input
                          type="text"
                          required
                          value={graduationYear}
                          onChange={(e) => setGraduationYear(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">
                          Số quyết định công nhận *
                        </label>
                        <input
                          type="text"
                          required
                          value={decisionNumber}
                          onChange={(e) => setDecisionNumber(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    {/* Attachment */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        File minh chứng văn bằng (PDF, Scan bằng cấp có công chứng) *
                      </label>
                      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-4 text-center hover:bg-gray-50 cursor-pointer">
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold text-black">Tải lên tệp chứng chỉ / văn bằng</span> (Tối đa 15MB)
                          <p className="text-[10px] text-gray-400 mt-0.5">Bản scan văn bằng hoặc quyết định bổ nhiệm học hàm</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        Yêu cầu sẽ được gửi tới Ban Quản trị viên để xét duyệt.
                      </span>
                      <button
                        type="submit"
                        className="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                      >
                        Gửi yêu cầu phê duyệt học vị
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: Thông tin cá nhân */}
              {activeTab === 'profile' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">2. Thông tin cá nhân &amp; Lý lịch cán bộ</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Hồ sơ cán bộ giảng viên được đồng bộ với CSDL Cán bộ viên chức.
                    </p>
                  </div>

                  <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Đã lưu thông tin cá nhân!'); }}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Họ và tên</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Mã cán bộ (MSGV)</label>
                        <input
                          type="text"
                          value={teacherId}
                          disabled
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 font-mono text-xs text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Email công vụ</label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 text-xs text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Số điện thoại</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Khoa / Viện</label>
                        <input
                          type="text"
                          value={faculty}
                          onChange={(e) => setFaculty(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Bộ môn</label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full bg-black px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                      >
                        Lưu thông tin cán bộ
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: Đổi mật khẩu */}
              {activeTab === 'security' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">3. Đổi mật khẩu tài khoản</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Bảo vệ quyền truy cập kho đề thi và thẩm định điểm số oral.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                      ✓ {passwordSuccess}
                    </div>
                  )}

                  {passwordError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-bold text-gray-700">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700">Mật khẩu mới</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full bg-black px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                      >
                        Cập nhật mật khẩu
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: Chữ ký số PKI HSM */}
              {activeTab === 'hsm' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">4. Chữ ký số PKI Cloud HSM Khảo thí</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Chứng chỉ số cá nhân dùng để ký niêm phong bảng điểm vấn đáp chính thức theo quy chế đào tạo.
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div>
                        <span className="font-bold text-emerald-900 block text-xs">Chứng thư số HSM Hoạt động</span>
                        <span className="text-[11px] text-emerald-700 font-mono">
                          Serial: VN-CA-UIT-2024-GV984210 • Hiệu lực đến: 31/12/2026
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-200 px-3 py-1 text-[10px] font-bold text-emerald-900">
                        ACTIVE
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                      <p>
                        Khi giảng viên xác nhận điểm cuối cùng tại <b>Evaluation Hub</b>, hệ thống sẽ tự động gọi dịch vụ ký số Cloud HSM để tạo mã băm SHA-256 niêm phong bài làm và transcript của sinh viên.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
