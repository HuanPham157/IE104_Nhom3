'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import { supabase } from '@/lib/supabase-browser';

export default function StudentProfile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'audio'>('profile');

  // Profile fields
  const [fullName, setFullName] = useState('Nguyễn Văn A');
  const [studentId] = useState('21520001');
  const [email] = useState('21520001@gm.uit.edu.vn');
  const [faculty, setFaculty] = useState('Khoa Công nghệ Phần mềm');
  const [major, setMajor] = useState('Kỹ thuật Phần mềm (K2021)');
  const [homeroomClass, setHomeroomClass] = useState('KTPM2021.1');
  const [phone, setPhone] = useState('0987.654.321');

  // Security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Audio mic testing state
  const [micTesting, setMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState('-18 dB');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSuccess('Đã lưu thông tin cá nhân thành công!');
    setTimeout(() => setProfileSuccess(''), 3000);
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

    setPasswordSuccess('Đổi mật khẩu thành công! Hãy đăng nhập lại khi hết phiên làm việc.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(''), 4000);
  }

  function toggleMicTest() {
    if (micTesting) {
      setMicTesting(false);
    } else {
      setMicTesting(true);
      setMicLevel('-14 dB (Tốt)');
      setTimeout(() => {
        setMicLevel('-12 dB (Tín hiệu trong trẻo)');
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1c1c] antialiased">
      <StudentSidebar
        currentPage="overview"
        fullName={fullName}
        institutionalId={studentId}
        signingOut={signingOut}
        interactiveUnavailable
        onSignOut={handleSignOut}
        onUnavailable={(action) => {
          if (action === 'classes') router.push('/student/classes');
          if (action === 'history') router.push('/student/history');
        }}
      />

      <div className="md:ml-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[#e5e5e5] bg-white/95 px-6 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/student" className="hover:text-black">
              Cổng sinh viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-black">Cài đặt tài khoản &amp; Hồ sơ cá nhân</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Tài khoản hoạt động
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                TÀI KHOẢN SINH VIÊN
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Hồ sơ Sinh viên &amp; Bảo mật
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Quản lý thông tin học vụ cá nhân, thay đổi mật khẩu và hiệu chuẩn sinh trắc giọng nói phục vụ thi vấn đáp oral AI.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs font-semibold text-gray-800">
                MSSV: {studentId}
              </span>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Nav Tabs */}
            <aside className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
                <span className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  MỤC THIẾT LẬP
                </span>
                <nav className="mt-1 space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'profile'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>1. Thông tin cá nhân &amp; Học vụ</span>
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
                    <span>2. Đổi mật khẩu &amp; Bảo mật</span>
                    {activeTab === 'security' && <span className="text-[10px] text-gray-400">Đang xem</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('audio')}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      activeTab === 'audio'
                        ? 'border-l-4 border-black bg-gray-100 font-bold text-black'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>3. Cấu hình Âm thanh &amp; Micro</span>
                    {activeTab === 'audio' && <span className="text-[10px] text-gray-400">Đang xem</span>}
                  </button>
                </nav>
              </div>

              {/* Voiceprint Biometric Card */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Sinh trắc học Giọng nói (Voiceprint)</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    ĐÃ KHỚP 100%
                  </span>
                </div>
                <p className="mt-2 text-xs text-emerald-800 leading-relaxed">
                  Mẫu phổ âm của bạn (Voiceprint #VN-8821) đã được lưu trữ bảo mật nhằm chống giả mạo giọng nói khi thi vấn đáp.
                </p>
                <button
                  type="button"
                  onClick={() => alert('Hiệu chuẩn lại mẫu giọng nói: Vui lòng đọc to đoạn văn mẫu 30s.')}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 hover:underline"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                  Ghi âm cập nhật mẫu giọng
                </button>
              </div>
            </aside>

            {/* Right Form Panels */}
            <div className="lg:col-span-8">
              {/* Tab 1: Profile Info */}
              {activeTab === 'profile' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">1. Thông tin cá nhân &amp; Học vụ</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Dữ liệu được đồng bộ từ Cơ sở dữ liệu Phòng Đào tạo (Cập nhật ngày 01/11/2024).
                    </p>
                  </div>

                  {profileSuccess && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                      ✓ {profileSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Họ và tên sinh viên</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Mã số sinh viên (MSSV)</label>
                        <input
                          type="text"
                          value={studentId}
                          disabled
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 font-mono text-xs text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Email học vụ (HUST / UIT)</label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2 text-xs text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Số điện thoại liên hệ</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700">Khoa / Viện</label>
                        <input
                          type="text"
                          value={faculty}
                          onChange={(e) => setFaculty(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Chuyên ngành</label>
                        <input
                          type="text"
                          value={major}
                          onChange={(e) => setMajor(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700">Lớp sinh hoạt</label>
                        <input
                          type="text"
                          value={homeroomClass}
                          onChange={(e) => setHomeroomClass(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full bg-black px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
                      >
                        Lưu thay đổi thông tin
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 2: Security & Password */}
              {activeTab === 'security' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">2. Đổi mật khẩu &amp; Bảo mật</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Đảm bảo an toàn tài khoản làm bài thi. Mật khẩu cần có tối thiểu 6 ký tự.
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
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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
                        className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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

              {/* Tab 3: Hardware & Audio Mic */}
              {activeTab === 'audio' && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-base font-bold text-gray-900">3. Cấu hình Âm thanh &amp; Micro</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Kiểm tra đường truyền thu âm trước khi vào phòng thi khảo thí giọng nói.
                    </p>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Thiết bị Microphone đầu vào
                      </label>
                      <select className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-black focus:outline-none">
                        <option>Microphone Array (Realtek(R) Audio) - Mặc định</option>
                        <option>Headset Microphone (Wireless Bluetooth)</option>
                        <option>USB Studio Condenser Microphone</option>
                      </select>
                    </div>

                    {/* Mic test box */}
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">Kiểm tra mức âm lượng tín hiệu (VU Meter)</span>
                        <span className="font-mono text-xs font-bold text-indigo-700">{micLevel}</span>
                      </div>

                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            micTesting ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                          style={{ width: micTesting ? '75%' : '10%' }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                          {micTesting
                            ? 'Đang lắng nghe... Hãy nói một câu mẫu vào mic'
                            : 'Nhấn vào nút bên cạnh để bắt đầu thử mic'}
                        </span>
                        <button
                          type="button"
                          onClick={toggleMicTest}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white transition ${
                            micTesting ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
                          }`}
                        >
                          {micTesting ? 'Dừng kiểm tra' : 'Thử Micro ngay'}
                        </button>
                      </div>
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
