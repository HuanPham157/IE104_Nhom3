'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase-browser';
import TeacherPageShell, { type TeacherPageProfile } from '@/components/TeacherPageShell';

type SettingsTab = 'profile' | 'security' | 'certificate' | 'audio';

function SettingsIcon({ name }: { name: 'profile' | 'lock' | 'key' | 'mic' | 'check' | 'cloud' | 'bell' | 'shield' }) {
  const paths = {
    profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 1 1 8 0v4',
    key: 'M21 2l-2 2m-7.5 7.5a5 5 0 1 1-7.07 7.07 5 5 0 0 1 7.07-7.07z M14.5 9.5 21 3m-3 3 2 2',
    mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v4 M8 22h8',
    check: 'M20 6 9 17l-5-5',
    cloud: 'M20 16.2A4.5 4.5 0 0 0 18 7.5a6 6 0 0 0-11.5 1.8A4 4 0 0 0 7 17h3 M12 13l-3 3 3 3 M9 16h8',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
    shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4',
  };
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d={paths[name]} /></svg>;
}

function SettingTab({ id, activeTab, onSelect, icon, children }: {
  id: SettingsTab;
  activeTab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  icon: 'profile' | 'lock' | 'key' | 'mic';
  children: string;
}) {
  return (
    <button type="button" role="tab" aria-selected={activeTab === id} onClick={() => onSelect(id)} className={`flex min-w-[155px] flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-center text-[10px] font-medium transition ${activeTab === id ? 'border-black text-gray-950' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}>
      <SettingsIcon name={icon} />{children}
    </button>
  );
}

function Field({ label, value, disabled = false, type = 'text' }: {
  label: string;
  value: string;
  disabled?: boolean;
  type?: 'text' | 'email' | 'tel';
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-semibold text-gray-600">{label}</span>
      <input type={type} readOnly value={value} aria-disabled={disabled} className={`h-10 w-full rounded-lg border px-3 text-[11px] outline-none ${disabled ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-gray-300 bg-white text-gray-900'}`} />
    </label>
  );
}

function PasswordSettings({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const strength = [
    newPassword.length >= 10,
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    /\d/.test(newPassword),
    /[^A-Za-z0-9]/.test(newPassword),
  ].filter(Boolean).length;
  const strengthLabel = newPassword.length === 0 ? 'Nhập mật khẩu mới' : strength >= 4 ? 'Mạnh' : strength >= 2 ? 'Trung bình' : 'Yếu';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setErrorMessage('');
    if (newPassword.length < 10) {
      setErrorMessage('Mật khẩu mới cần có ít nhất 10 ký tự.');
      return;
    }
    if (newPassword !== confirmation) {
      setErrorMessage('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setErrorMessage('Mật khẩu hiện tại không chính xác hoặc không thể xác minh tài khoản.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setErrorMessage('Không thể cập nhật mật khẩu. Hãy kiểm tra kết nối hoặc chính sách xác thực rồi thử lại.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setMessage('Mật khẩu đã được cập nhật thành công.');
    } catch {
      setErrorMessage('Không thể kết nối để cập nhật mật khẩu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="text-[12px] font-semibold">Đổi mật khẩu tài khoản</h3><p className="mt-1 text-[10px] text-gray-500">Chọn mật khẩu dài ít nhất 10 ký tự.</p></div>
        <span className="text-[9px] text-gray-500">Tài khoản được bảo vệ an toàn</span>
      </div>
      <div className="mt-4 space-y-3">
        <label className="block"><span className="sr-only">Mật khẩu hiện tại</span><input aria-label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[11px] outline-none focus:border-gray-500" /></label>
        <label className="block"><span className="sr-only">Mật khẩu mới</span><input aria-label="Mật khẩu mới" type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới (tối thiểu 10 ký tự)" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[11px] outline-none focus:border-gray-500" /></label>
        <div aria-label={`Độ mạnh mật khẩu: ${strengthLabel}`} className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((segment) => <span key={segment} className={`h-1 flex-1 rounded-full ${segment < strength ? strength >= 4 ? 'bg-emerald-700' : strength >= 2 ? 'bg-amber-500' : 'bg-red-500' : 'bg-gray-200'}`} />)}
          <span className={`min-w-[72px] text-right text-[9px] ${strength >= 4 ? 'text-emerald-700' : 'text-gray-500'}`}>{strengthLabel}</span>
        </div>
        <label className="block"><span className="sr-only">Xác nhận mật khẩu mới</span><input aria-label="Xác nhận mật khẩu mới" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Xác nhận mật khẩu mới" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-[11px] outline-none focus:border-gray-500" /></label>
      </div>
      {errorMessage && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[10px] text-red-700">{errorMessage}</p>}
      {message && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800">{message}</p>}
      <button type="submit" disabled={saving} className="mt-4 h-9 rounded-full bg-black px-4 text-[10px] font-semibold text-white hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">{saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</button>
    </form>
  );
}

function AudioSettings() {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-[12px] font-semibold text-amber-900">Thiết bị âm thanh và thông báo</h3>
      <p className="mt-2 text-[10px] leading-5 text-amber-900">
        Kiểm tra microphone, ghi âm, camera và xử lý giọng nói đang được tạm hoãn. Trang này không yêu cầu quyền truy cập thiết bị.
      </p>
    </section>
  );
}

function TeacherSettingsContent({ profile }: { profile: TeacherPageProfile }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [notice, setNotice] = useState('');
  const tabs: { id: SettingsTab; label: string; icon: 'profile' | 'lock' | 'key' | 'mic' }[] = [
    { id: 'profile', label: 'Thông tin học thuật & Hồ sơ', icon: 'profile' },
    { id: 'security', label: 'Bảo mật & Mật khẩu', icon: 'lock' },
    { id: 'certificate', label: 'Chữ ký số & Chứng thư HSM', icon: 'key' },
    { id: 'audio', label: 'Thiết bị Âm thanh & Thông báo', icon: 'mic' },
  ];

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    setNotice('');
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-[23px] font-bold leading-tight sm:text-[28px]">Cài đặt Cá nhân &amp; Hồ sơ Giảng viên</h1>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-gray-600">Thông tin hồ sơ hiện được đọc từ dữ liệu tài khoản. Tính năng chữ ký số và thiết bị âm thanh chưa được tích hợp.</p>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] text-gray-500"><SettingsIcon name="shield" />HSM: Chưa kết nối</span>
      </div>

      <div role="tablist" aria-label="Mục cài đặt giảng viên" className="mt-4 flex overflow-x-auto border-b border-gray-200 bg-white">
        {tabs.map((tab) => <SettingTab key={tab.id} id={tab.id} icon={tab.icon} activeTab={activeTab} onSelect={selectTab}>{tab.label}</SettingTab>)}
      </div>

      {activeTab === 'profile' && (
        <section className="mt-4 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div><h2 className="text-[15px] font-bold">Thông tin Định danh Giảng viên</h2><p className="mt-1 text-[10px] text-gray-500">Dữ liệu tài khoản được đồng bộ từ thông tin đăng ký hiện có.</p></div>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[9px] font-semibold text-indigo-800">Giảng viên · {profile.faculty || 'Chưa cập nhật khoa'}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-start gap-4 rounded-xl bg-gray-50 p-4">
            <div className="flex h-[84px] w-[84px] items-center justify-center rounded-xl border border-gray-200 bg-indigo-50 text-xl font-bold text-indigo-800">{profile.fullName.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('') || 'GV'}</div>
            <div className="max-w-md"><p className="text-[11px] font-semibold">Ảnh chân dung</p><p className="mt-1 text-[10px] leading-relaxed text-gray-500">Ảnh đại diện sẽ khả dụng sau khi tích hợp lưu trữ hồ sơ. Không tải ảnh lên trong bản xem trước này.</p><button type="button" disabled title="Chưa tích hợp tải ảnh hồ sơ" className="mt-2 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-[9px] text-gray-500">Thay đổi ảnh · Chưa khả dụng</button></div>
            <span className="ml-auto rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[9px] font-medium text-indigo-800">Hồ sơ tài khoản</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" value={profile.fullName || 'Chưa cập nhật'} />
            <Field label="Mã giảng viên (MSGV)" value={profile.institutionalId || 'Chưa cập nhật'} disabled />
            <Field label="Email học thuật" value={profile.email || 'Chưa cập nhật'} type="email" />
            <Field label="Số điện thoại liên hệ" value="" type="tel" />
            <Field label="Hướng nghiên cứu chính / Chuyên ngành" value={profile.faculty || 'Chưa cập nhật'} />
          </div>
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">Các trường hồ sơ ở chế độ chỉ đọc vì chưa có API lưu hồ sơ giảng viên. Không có thay đổi nào được lưu giả lập.</p>
        </section>
      )}

      {activeTab === 'security' && (
        <section className="mt-4 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div><h2 className="text-[15px] font-bold">Bảo mật &amp; Ký số Khảo thí</h2><p className="mt-1 text-[10px] text-gray-500">Quản lý bảo vệ tài khoản và xác thực khi truy cập dữ liệu khảo thí.</p></div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[9px] font-semibold text-amber-800">HSM · Chưa tích hợp</span>
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="flex items-center gap-2 text-[11px] font-semibold"><SettingsIcon name="key" />Token ký số Cloud HSM</h3><p className="mt-1 text-[10px] text-gray-500">Nhà cung cấp, chứng thư và dịch vụ ký số chưa kết nối.</p></div>
              <button type="button" disabled className="rounded-full border border-gray-200 bg-white px-3 py-2 text-[9px] text-gray-500">Kiểm tra chứng thư · Chưa khả dụng</button>
            </div>
            <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-3">
              <p className="rounded-lg bg-white p-3">Trạng thái: <b className="text-amber-800">Chưa kết nối</b></p>
              <p className="rounded-lg bg-white p-3">Nhà cung cấp: <b>Chưa cấu hình</b></p>
              <p className="rounded-lg bg-white p-3">Chuẩn ký: <b>Chưa cấu hình</b></p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="flex min-h-[150px] flex-col rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800"><SettingsIcon name="shield" />Xác thực 2 bước (2FA)</h3><p className="mt-1 text-[10px] text-gray-500">Thêm lớp bảo vệ tài khoản giảng viên.</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] text-gray-600">Chưa bật</span></div>
              <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-3 text-[9px]"><span className="text-gray-500">TOTP / Authenticator</span><button type="button" disabled className="font-semibold text-gray-400">Cấu hình · Chưa hỗ trợ</button></div>
            </div>
            <PasswordSettings email={profile.email} />
          </div>
        </section>
      )}

      {activeTab === 'certificate' && (
        <section className="mt-4 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-6">
          <div className="border-b border-gray-200 pb-4"><h2 className="text-[15px] font-bold">Chữ ký số &amp; Chứng thư HSM</h2><p className="mt-1 text-[10px] text-gray-500">Trạng thái tích hợp chữ ký số cho bảng điểm và biên bản khảo thí.</p></div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div><h3 className="flex items-center gap-2 text-[12px] font-semibold"><SettingsIcon name="key" />Chưa có chứng thư số được kết nối</h3><p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-gray-700">Tích hợp Cloud HSM/TSA cần cấu hình backend, thông tin nhà cung cấp và chính sách cấp phát chứng thư. Không nhập khóa riêng hoặc bí mật HSM vào trình duyệt.</p></div>
            <span className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[9px] font-semibold text-amber-800">Chưa tích hợp</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Nhà cung cấp chứng thư" value="Chưa cấu hình" disabled /><Field label="Ngày hết hạn" value="Chưa có dữ liệu" disabled /><Field label="Dấu thời gian TSA" value="Chưa kết nối" disabled /></div>
        </section>
      )}

      {activeTab === 'audio' && (
        <div className="mt-4">
          <AudioSettings />
        </div>
      )}

      {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-800">{notice}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="flex items-center gap-2 text-[10px] text-gray-500"><SettingsIcon name="cloud" />{activeTab === 'security' ? 'Mật khẩu mới được cập nhật ngay sau khi xác nhận.' : 'Tùy chọn này hiện chưa khả dụng.'}</span>
        <div className="flex gap-2"><button type="button" onClick={() => { selectTab('profile'); setNotice(''); }} className="h-9 rounded-full border border-gray-300 px-4 text-[10px] hover:bg-gray-50">Hủy bỏ</button><button type="button" onClick={() => setNotice('Không có thay đổi nào được lưu: API cập nhật cài đặt hồ sơ chưa được tích hợp.')} className="h-9 rounded-full bg-black px-4 text-[10px] font-semibold text-white hover:bg-gray-800">Lưu thay đổi hồ sơ</button></div>
      </div>
    </>
  );
}

export default function TeacherSettings() {
  return (
    <TeacherPageShell currentPage="settings" breadcrumb="Tài khoản / Cài đặt cá nhân">
      {(profile) => <TeacherSettingsContent profile={profile} />}
    </TeacherPageShell>
  );
}
