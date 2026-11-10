'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

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
    <main className="flex min-h-screen flex-col bg-[#fafafa] text-[#202124] antialiased">
      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#e9e9e9] bg-white px-5 sm:px-8">
        <Link href="/login" className="flex items-center gap-2.5" aria-label="AIOralCheck - Trang đăng nhập">
          <span className="flex h-8 w-8 items-center justify-center gap-[2px] rounded-md bg-[#171923]">
            <span className="h-3 w-[3px] rounded-full bg-[#a5a0ff]" />
            <span className="h-5 w-[3px] rounded-full bg-[#726bff]" />
            <span className="h-3.5 w-[3px] rounded-full bg-[#c4c0ff]" />
          </span>
          <span className="text-[15px] font-bold tracking-tight">AIOralCheck</span>
          <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#087b48]" aria-label="Hệ thống hoạt động" />
        </Link>

        <nav aria-label="Tiện ích" className="flex items-center gap-2 text-[11px] text-[#555]">
          <span className="hidden rounded-full border border-[#e5e5e5] bg-[#f7f7f7] px-2.5 py-1 sm:inline-flex">
            Bảo mật
          </span>
          <span className="hidden rounded-full border border-[#e5e5e5] px-2.5 py-1 sm:inline-flex">
            Trợ giúp khảo thí
          </span>
          <span className="rounded-full border border-[#e5e5e5] bg-[#f7f7f7] px-2.5 py-1">
            VI
          </span>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_410px] lg:gap-12 xl:gap-16 xl:px-10">
        <section className="mx-auto w-full max-w-[600px] lg:mx-0">
          <h1 className="max-w-[570px] text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-[38px]">
            Nền tảng quản lý lớp học và bài tập.
          </h1>
          <p className="mt-3 max-w-[560px] text-[14px] leading-[1.7] text-[#666]">
            Đăng nhập để quản lý lớp học, soạn bài tập hoặc xem các lớp bạn đã tham gia.
            Ghi âm, camera, chuyển giọng nói thành văn bản và AI hiện chưa được bật.
          </p>

          <div className="mt-6 rounded-[18px] border border-[#e5e5e5] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.03)] sm:p-5">
            <div className="flex items-center gap-2.5 border-b border-[#ededed] pb-3">
              <span className="h-2 w-2 rounded-full bg-[#087b48]" />
              <h2 className="text-[13px] font-semibold">Các luồng đang hoạt động</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f7f7f7] p-3">
                <p className="text-xs font-semibold text-gray-900">Lớp học</p>
                <p className="mt-1 text-[11px] leading-5 text-gray-600">Tạo yêu cầu, duyệt lớp và tham gia bằng mã.</p>
              </div>
              <div className="rounded-xl bg-[#f7f7f7] p-3">
                <p className="text-xs font-semibold text-gray-900">Bài tập</p>
                <p className="mt-1 text-[11px] leading-5 text-gray-600">Soạn câu hỏi, công bố và xem đề bài theo lớp.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[18px] border border-[#e8e8e8] bg-white shadow-[0_12px_35px_rgba(0,0,0,0.06)] lg:mx-0">
          <div className="h-[3px] bg-gradient-to-r from-[#22222a] via-[#7168ff] to-[#22222a]" />
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-2 rounded-[10px] bg-[#efefef] p-1">
              <span
                aria-current="page"
                className="flex h-9 items-center justify-center rounded-[7px] bg-white text-[12px] font-semibold shadow-sm"
              >
                Đăng nhập
              </span>
              <Link
                href="/signup"
                className="flex h-9 items-center justify-center rounded-[7px] text-[12px] font-medium text-[#555] transition hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7168ff]"
              >
                Đăng ký tài khoản
              </Link>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              <div>
                <label
                  className="mb-1.5 block text-[10px] font-semibold text-[#444]"
                  htmlFor="email-input"
                >
                  Email tài khoản
                  <span className="float-right font-normal text-[#777]">Dùng email đã đăng ký</span>
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
                  className="h-10 w-full rounded-md border border-[#d4d4d4] bg-[#f3f3f3] px-3 text-[12px] text-[#202124] outline-none transition focus:border-[#777] focus:bg-white focus:ring-2 focus:ring-[#777]/15 disabled:opacity-60"
                  placeholder="ten@trường.edu.vn"
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-[10px] font-semibold text-[#444]"
                  htmlFor="password-input"
                >
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
                    className="h-10 w-full rounded-md border border-[#d4d4d4] bg-[#f3f3f3] px-3 pr-12 text-[12px] text-[#202124] outline-none transition focus:border-[#777] focus:bg-white focus:ring-2 focus:ring-[#777]/15 disabled:opacity-60"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-[10px] text-[#666] hover:text-[#222] focus-visible:outline-2 focus-visible:outline-[#7168ff] disabled:opacity-60"
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#151617] px-4 text-[12px] font-semibold text-white transition hover:bg-[#303234] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7168ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Đang xác thực...'
                  : 'Đăng nhập ngay vào hệ thống →'}
              </button>
            </form>

            <p className="mt-4 border-t border-[#ededed] pt-3 text-center text-[10px] leading-relaxed text-[#777]">
              Đăng nhập an toàn.
            </p>
          </div>
        </section>
      </div>

      <footer className="flex min-h-[48px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#e8e8e8] bg-white px-5 py-3 text-[10px] text-[#666] sm:px-8">
        <span className="font-medium text-[#333]">© 2026 AIOralCheck. Bản quyền thuộc về nhóm 3.</span>
        <span className="flex items-center gap-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[#087b48]" />
          <span>Quy chuẩn dữ liệu âm thanh</span>
          <span>Điều khoản dịch vụ</span>
        </span>
      </footer>
    </main>
  );
}
