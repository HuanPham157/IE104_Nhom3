'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import AuthShell, { authInputClass, authLabelClass, authPrimaryButton } from '@/features/auth/components/AuthShell';

const eyeIcon = (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
    <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" stroke="currentColor" />
    <circle cx="8" cy="8" r="1.7" stroke="currentColor" />
  </svg>
);

const eyeButtonClass =
  'absolute inset-y-1.5 right-1.5 flex w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-800';

function Signup() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const institutionalId = String(formData.get('institutionalId') ?? '').trim();
    const fullName = String(formData.get('fullName') ?? '').trim();
    const faculty = String(formData.get('faculty') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            institutional_id: institutionalId,
            full_name: fullName,
            faculty,
          },
        },
      });

      if (error) {
        if (/already registered|already been registered/i.test(error.message)) {
          setErrorMessage('Email này đã được đăng ký. Hãy đăng nhập hoặc sử dụng email khác.');
        } else if (error.message.includes('Database error saving new user')) {
          setErrorMessage(
            'Không thể tạo hồ sơ. Hãy kiểm tra mã số đã được sử dụng chưa và thử lại sau.',
          );
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data.session) {
        router.replace('/student');
        router.refresh();
        return;
      }

      setSuccessMessage(
        'Nếu địa chỉ email này có thể đăng ký, chúng tôi sẽ gửi hướng dẫn xác nhận. Hãy kiểm tra hộp thư đến và thư mục spam.',
      );
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Không thể kết nối dịch vụ: ${error.message}`
          : 'Không thể kết nối dịch vụ đăng ký. Vui lòng kiểm tra mạng và thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Tài khoản sinh viên</p>
        <h1 className="mt-2 text-[30px] font-bold leading-tight text-gray-900">Tạo tài khoản mới</h1>
        <p className="mt-2 text-[14px] leading-6 text-gray-500">
          Tham gia lớp bằng mã giảng viên cung cấp và bắt đầu làm bài vấn đáp. Tài khoản giảng viên do quản trị viên cấp riêng.
        </p>
      </div>

      <form className="mt-7" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="institutional-id" className={authLabelClass}>
              <span>Mã số Sinh viên (MSSV)</span>
              <span className="font-normal text-gray-400">Cấp bởi Phòng Đào tạo</span>
            </label>
            <input id="institutional-id" name="institutionalId" type="text" autoComplete="off" required className={authInputClass} placeholder="Ví dụ: 2021601234" />
          </div>

          <div>
            <label htmlFor="full-name" className={authLabelClass}>Họ tên</label>
            <input id="full-name" name="fullName" type="text" autoComplete="name" required className={authInputClass} placeholder="Nguyễn Văn A" />
          </div>

          <div>
            <label htmlFor="signup-email" className={authLabelClass}>Email</label>
            <input id="signup-email" name="email" type="email" autoComplete="email" required className={authInputClass} placeholder="ten@uit.edu.vn" />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="faculty" className={authLabelClass}>Khoa</label>
            <select id="faculty" name="faculty" required defaultValue="" className={`${authInputClass} appearance-auto`}>
              <option value="" disabled>Chọn khoa</option>
              <option value="Khoa Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
              <option value="Khoa Hệ thống Thông tin">Khoa Hệ thống Thông tin</option>
              <option value="Khoa Khoa học Máy tính">Khoa Khoa học Máy tính</option>
              <option value="Khoa khác">Khoa khác</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className={authLabelClass}>Mật khẩu</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                className={`${authInputClass} pr-11`}
                placeholder="Tối thiểu 8 ký tự"
              />
              <button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(!showPassword)} className={eyeButtonClass}>
                {eyeIcon}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className={authLabelClass}>Xác nhận lại mật khẩu</label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                className={`${authInputClass} pr-11`}
                placeholder="Nhập lại mật khẩu"
              />
              <button type="button" aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={eyeButtonClass}>
                {eyeIcon}
              </button>
            </div>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-[12px] leading-5 text-gray-600 transition hover:border-gray-300">
          <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300" />
          <span>
            Tôi đồng ý tuân thủ Quy chế thi trực tuyến và chính sách bảo mật bản ghi âm giọng nói của hệ thống.
          </span>
        </label>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-5 text-red-700">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[13px] leading-5 text-emerald-800">
            {successMessage}
          </p>
        )}

        <button type="submit" disabled={loading} className={`${authPrimaryButton} mt-5`}>
          {loading ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Đang tạo tài khoản...
            </>
          ) : (
            <>
              Đăng ký tài khoản Sinh viên
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-gray-500">
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}

export default Signup;
