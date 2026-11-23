'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import AuthShell, { authInputClass, authLabelClass, authPrimaryButton } from '@/features/auth/components/AuthShell';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Tài khoản chưa được xác nhận email. Hãy kiểm tra hộp thư đến.');
        } else {
          setErrorMessage(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
        return;
      }

      if (data.session) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role,account_status')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profileError) {
          const { error: signOutError } = await supabase.auth.signOut();
          setErrorMessage(
            signOutError
              ? 'Không thể tải hồ sơ hoặc đóng phiên đăng nhập. Hãy tải lại trang và thử lại.'
              : 'Không thể tải hồ sơ tài khoản. Vui lòng thử lại sau.',
          );
          return;
        }

        if (!profile || profile.account_status !== 'active') {
          const { error: signOutError } = await supabase.auth.signOut();
          setErrorMessage(
            signOutError
              ? 'Tài khoản chưa có hồ sơ hoạt động và phiên chưa thể đóng. Hãy tải lại trang hoặc liên hệ quản trị viên.'
              : 'Tài khoản chưa có hồ sơ hoạt động. Vui lòng liên hệ quản trị viên.',
          );
          return;
        }

        const destination = profile.role === 'admin'
          ? '/admin'
          : profile.role === 'lecturer'
            ? '/teacher'
            : profile.role === 'student'
              ? '/student'
              : null;
        if (!destination) {
          await supabase.auth.signOut();
          setErrorMessage('Vai trò tài khoản không hợp lệ. Vui lòng liên hệ quản trị viên.');
          return;
        }
        router.replace(destination);
      }
    } catch {
      setErrorMessage(
        'Không thể kết nối đến máy chủ xác thực. Kiểm tra mạng hoặc biến môi trường .env.local.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">Chào mừng trở lại</p>
        <h1 className="mt-2 text-[30px] font-bold leading-tight text-gray-900">Đăng nhập AIOralCheck</h1>
        <p className="mt-2 text-[14px] leading-6 text-gray-500">
          Vào lớp học, làm bài vấn đáp hoặc quản lý đề thi bằng tài khoản đã được cấp.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {errorMessage && (
          <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-5 text-red-700">
            <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-red-500 text-center text-[11px] font-bold leading-4 text-white">!</span>
            {errorMessage}
          </p>
        )}

        <div>
          <label className={authLabelClass} htmlFor="email-input">
            Email tài khoản
            <span className="font-normal text-gray-400">Dùng email đã đăng ký</span>
          </label>
          <input
            id="email-input"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
            className={authInputClass}
            placeholder="ten@trường.edu.vn"
          />
        </div>

        <div>
          <label className={authLabelClass} htmlFor="password-input">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password-input"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              className={`${authInputClass} pr-16`}
              placeholder="Nhập mật khẩu"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={loading}
              className="absolute inset-y-1.5 right-1.5 rounded-lg px-3 text-[12px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60"
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={authPrimaryButton}>
          {loading ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Đang xác thực...
            </>
          ) : (
            <>
              Đăng nhập ngay vào hệ thống
              <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-[13px] text-gray-500">
        Chưa có tài khoản sinh viên?{' '}
        <Link href="/signup" className="font-semibold text-brand-700 hover:text-brand-600 hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </AuthShell>
  );
}
