'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import TeacherPageShell, { type TeacherPageProfile } from '@/components/TeacherPageShell';

interface ProfileFieldProps {
  label: string;
  value?: string;
  type?: 'text' | 'email' | 'tel';
  wide?: boolean;
}

function ProfileField({ label, value = '', type = 'text', wide = false }: ProfileFieldProps) {
  return (
    <label className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-[10px] font-medium text-gray-600">{label}</span>
      <input
        type={type}
        readOnly
        value={value}
        placeholder={value ? undefined : 'Chưa cập nhật'}
        className="h-9 w-full rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 text-[11px] text-gray-800 outline-none placeholder:text-gray-400"
      />
    </label>
  );
}

function ProfileSection({ id, number, title, description, children }: {
  id: string;
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-[#e1e1e1] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-[14px] font-bold">{number}. {title}</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{description}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] text-gray-600">Thông tin hồ sơ</span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TeacherProfileForm({ profile }: { profile: TeacherPageProfile }) {
  const imageObjectUrl = useRef<string | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageMessage, setImageMessage] = useState('');

  useEffect(() => () => {
    if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
  }, []);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageMessage('Vui lòng chọn tệp hình ảnh hợp lệ.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageMessage('Ảnh phải có dung lượng tối đa 5 MB.');
      return;
    }
    if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    imageObjectUrl.current = URL.createObjectURL(file);
    setImagePreview(imageObjectUrl.current);
    setImageMessage('Ảnh chỉ được xem trên thiết bị này, chưa tải lên hệ thống.');
  }

  const basicFields = [
    { label: 'Họ và tên', value: profile.fullName },
    { label: 'Mã cán bộ / Giảng viên', value: profile.institutionalId },
    { label: 'Ngày sinh' },
    { label: 'Giới tính' },
    { label: 'Dân tộc' },
    { label: 'Tôn giáo' },
    { label: 'Quốc tịch' },
    { label: 'Email công vụ', value: profile.email, type: 'email' as const },
    { label: 'Số điện thoại liên hệ', type: 'tel' as const },
    { label: 'Nơi sinh', wide: true },
    { label: 'Quê quán', wide: true },
    { label: 'Học hàm / Học vị & Ngạch viên chức', value: 'Chưa cập nhật' },
    { label: 'Đơn vị / Khoa chuyên môn', value: profile.faculty },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-[23px] font-bold sm:text-[28px]">Xin chào, {profile.fullName || 'Giảng viên'}! 🎓</h1>
          <p className="mt-1 max-w-2xl text-[12px] text-gray-600">Tổng hợp thông tin hồ sơ giảng viên. Dashboard tổng quan vẫn được giữ nguyên và có thể mở lại bất cứ lúc nào.</p>
          <span className="mt-2 inline-flex rounded-full border border-[#eadcae] bg-[#fff9e9] px-2 py-0.5 text-[8px] font-semibold text-[#81621c]">HỒ SƠ CÁ NHÂN · DỮ LIỆU CẬP NHẬT TỪ TÀI KHOẢN</span>
        </div>
        <button type="button" disabled title="Chức năng xuất hồ sơ chưa được kết nối" className="h-9 rounded-full border border-gray-200 bg-gray-100 px-4 text-[10px] font-medium text-gray-500">Xuất hồ sơ (chưa khả dụng)</button>
      </div>

      <nav aria-label="Các mục hồ sơ" className="sticky top-[68px] z-[5] mt-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {[['personal', 'Thông tin cá nhân'], ['address', 'Hộ khẩu & Cư trú'], ['identity', 'Giấy tờ tùy thân'], ['career', 'Đoàn - Đảng & Công tác'], ['finance', 'Ngân hàng & Thuế'], ['insurance', 'BHXH & BHYT'], ['security', 'Chữ ký số & Âm học']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg px-3 py-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">{label}</a>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        <ProfileSection id="personal" number="1" title="Thông tin Cá nhân & Nhân thân" description="Thông tin cơ bản hiện có trong hồ sơ tài khoản giảng viên. Các trường còn lại chưa được cung cấp.">
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl bg-[#fafafa] p-3">
            <div aria-label="Ảnh đại diện hồ sơ" className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-[#efefff] text-xl font-bold text-indigo-800" style={imagePreview ? { backgroundImage: `url("${imagePreview}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}>
              {!imagePreview && (profile.fullName.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('') || 'GV')}
            </div>
            <div>
              <label className="inline-flex cursor-pointer rounded-full border border-gray-300 bg-white px-3 py-2 text-[10px] font-medium hover:bg-gray-50">
                Chọn ảnh chân dung
                <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              </label>
              <p className="mt-2 text-[9px] text-gray-500">Ảnh JPG, PNG hoặc WebP, tối đa 5 MB. Chưa tải lên hệ thống.</p>
              {imageMessage && <p role="status" className="mt-1 text-[9px] text-indigo-700">{imageMessage}</p>}
            </div>
            <span className="ml-auto rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[9px] font-semibold text-indigo-800">{profile.faculty || 'Giảng viên'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {basicFields.map((field) => <ProfileField key={field.label} {...field} />)}
          </div>
        </ProfileSection>

        <ProfileSection id="address" number="2" title="Hộ khẩu & Địa chỉ cư trú" description="Thông tin địa chỉ thường trú và nơi ở hiện tại chưa được đồng bộ vào hồ sơ.">
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-[#f7f7f7] p-3">
              <p className="mb-3 text-[10px] font-semibold">Hộ khẩu thường trú</p>
              <div className="grid gap-3 sm:grid-cols-3"><ProfileField label="Số nhà, đường, phường / xã" wide /><ProfileField label="Tỉnh / Thành phố trực thuộc" /></div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="mb-3 text-[10px] font-semibold">Nơi ở hiện tại / Tạm trú</p>
              <div className="grid gap-3 sm:grid-cols-3"><ProfileField label="Địa chỉ hiện tại chi tiết" wide /><ProfileField label="Quận / Huyện cư trú" /></div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="mb-3 text-[10px] font-semibold">Thông tin người liên hệ khẩn cấp</p>
              <div className="grid gap-3 sm:grid-cols-3"><ProfileField label="Họ và tên người thân" /><ProfileField label="Mối quan hệ" /><ProfileField label="Số điện thoại người thân" type="tel" /></div>
            </div>
          </div>
        </ProfileSection>

        <ProfileSection id="identity" number="3" title="Giấy tờ tùy thân & Định danh điện tử" description="Các giấy tờ cần được bổ sung qua kênh quản lý hồ sơ của đơn vị.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Loại giấy tờ tùy thân" />
            <ProfileField label="Số CCCD / CMND" />
            <ProfileField label="Ngày cấp" />
            <ProfileField label="Nơi cấp" wide />
            <ProfileField label="Số hộ chiếu (Passport)" />
            <ProfileField label="Ngày hết hạn hộ chiếu" />
            <ProfileField label="Giấy phép lái xe" />
          </div>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-[10px] text-amber-800">Không nhập thông tin giấy tờ tùy thân trên bản xem trước. Các trường này chỉ hiển thị sau khi có tích hợp hồ sơ bảo mật.</p>
        </ProfileSection>

        <ProfileSection id="career" number="4" title="Đoàn - Đảng - Quá trình công tác & Học hàm học vị" description="Hồ sơ công tác, giảng dạy và học thuật.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Ngày vào Đoàn TNCS HCM" />
            <ProfileField label="Ngày kết nạp Đảng" />
            <ProfileField label="Ngày công nhận chính thức" />
            <ProfileField label="Số thẻ Đảng viên" />
            <ProfileField label="Chức vụ Đảng / Đoàn hiện tại" wide />
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="text-[11px] font-semibold">Quá trình công tác & Giảng dạy</h3>
            <p className="mt-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-[10px] text-gray-500">Chưa có thông tin quá trình công tác trong hồ sơ tài khoản.</p>
          </div>
        </ProfileSection>

        <ProfileSection id="finance" number="5" title="Tài khoản Ngân hàng & Mã số thuế" description="Thông tin thanh toán và mã số thuế hiện chưa được cung cấp.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Ngân hàng thụ hưởng & Chi nhánh" wide />
            <ProfileField label="Số tài khoản (IBAN / STK)" />
            <ProfileField label="Tên chủ tài khoản" />
            <ProfileField label="Mã số thuế cá nhân (MST)" />
            <ProfileField label="Cơ quan thuế quản lý" />
          </div>
        </ProfileSection>

        <ProfileSection id="insurance" number="6" title="Bảo hiểm xã hội (BHXH) & Bảo hiểm y tế (BHYT)" description="Dữ liệu bảo hiểm chưa được kết nối với hồ sơ giảng viên.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Số sổ BHXH" />
            <ProfileField label="Tình trạng đóng BHXH" />
            <ProfileField label="Mã số thẻ BHYT" />
            <ProfileField label="Nơi đăng ký khám chữa bệnh ban đầu" wide />
            <ProfileField label="Thời hạn giá trị thẻ" />
          </div>
        </ProfileSection>

        <ProfileSection id="security" number="7" title="Chữ ký số HSM & Bảo mật Khảo thí âm học" description="Trạng thái chứng thư số và thiết bị âm học dành cho tài khoản giảng viên.">
          <div className="rounded-xl border border-gray-200 bg-[#f7f7f7] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="text-[11px] font-semibold">Chứng thư số giảng viên</h3><p className="mt-1 text-[10px] text-gray-600">Chưa kết nối nhà cung cấp HSM hoặc dịch vụ chứng thư số.</p></div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[9px] font-semibold text-amber-800">Chưa tích hợp</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><ProfileField label="Nhà cung cấp chứng thư" /><ProfileField label="Thiết bị bảo mật" /></div>
          </div>
          <div className="mt-3 rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-[11px] font-semibold">Thiết bị thu âm khảo thí</h3><p className="mt-1 text-[10px] text-gray-600">Thiết lập micro và kiểm tra âm thanh trên trình duyệt.</p></div>
              <button type="button" disabled title="Cài đặt thiết bị giảng viên chưa được triển khai" className="rounded-full border border-gray-200 bg-gray-100 px-3 py-2 text-[10px] text-gray-500">Kiểm tra thiết bị · Chưa khả dụng</button>
            </div>
          </div>
        </ProfileSection>
      </div>
    </>
  );
}

export default function TeacherProfile() {
  return (
    <TeacherPageShell currentPage="profile" breadcrumb="Hồ sơ cá nhân">
      {(profile) => <TeacherProfileForm profile={profile} />}
    </TeacherPageShell>
  );
}
