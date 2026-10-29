'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase-browser';

type Role = 'student' | 'teacher';

const fieldClassName =
  'h-[29px] w-full rounded-md border border-[#d4d4d4] bg-[#f3f3f3] px-3 text-[10px] text-[#202124] outline-none transition focus:border-[#555] focus:bg-white focus:ring-1 focus:ring-[#555]/20';

function Signup() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('student');
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
            role,
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
            'Không thể tạo hồ sơ. Hãy kiểm tra mã số đã được sử dụng chưa và xác nhận quản trị viên đã chạy migration Supabase.',
          );
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data.session) {
        router.replace('/tasks');
        router.refresh();
        return;
      }

      setSuccessMessage(
        'Nếu địa chỉ email này có thể đăng ký, Supabase sẽ gửi hướng dẫn xác nhận. Hãy kiểm tra hộp thư đến và thư mục spam.',
      );
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Không thể kết nối Supabase: ${error.message}`
          : 'Không thể kết nối Supabase. Vui lòng kiểm tra mạng và thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f8] font-sans text-[#171717]">
      <header className="flex h-[42px] shrink-0 items-center justify-between border-b border-[#e8e8e8] px-4 sm:px-[26px]">
        <Link href="/signup" className="flex items-center gap-1.5" aria-label="AIOralCheck">
          <Image
            src="/images/oralcheck-mark.svg"
            alt=""
            width={21}
            height={22}
          />
          <span className="text-[14px] font-bold tracking-[-0.04em]">AIOralCheck</span>
          <span className="ml-2 h-[5px] w-[5px] rounded-full bg-[#087b48]" aria-label="Hệ thống hoạt động" />
        </Link>

        <div className="flex items-center gap-2 text-[9px] text-[#353535]">
          <button
            type="button"
            aria-label="Kết nối bảo mật"
            className="flex h-[23px] w-[24px] items-center justify-center rounded-full border border-[#e6e6e6] bg-[#f1f1f1]"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
              <rect x="3.5" y="7" width="9" height="6" rx="1.5" stroke="currentColor" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2M8 9.5v1" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-[23px] items-center gap-1 rounded-full border border-[#e6e6e6] bg-[#fafafa] px-2"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" />
              <path d="M6.7 6.2a1.4 1.4 0 1 1 2.4 1c-.7.7-1.1.8-1.1 1.8M8 11.2v.1" stroke="currentColor" strokeLinecap="round" />
            </svg>
            Trợ giúp khảo thí
          </button>
          <button
            type="button"
            className="flex h-[23px] items-center gap-1 rounded-full border border-[#e6e6e6] bg-[#f1f1f1] px-2"
            aria-label="Ngôn ngữ: Tiếng Việt"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" />
              <path d="M2.8 8h10.4M8 2.5c1.3 1.5 1.8 3.3 1.8 5.5s-.5 4-1.8 5.5C6.7 12 6.2 10.2 6.2 8s.5-4 1.8-5.5Z" stroke="currentColor" />
            </svg>
            VIE
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-8 px-4 pb-3 pt-8 sm:px-[26px] md:grid-cols-2 md:gap-0">
        <section className="w-full max-w-[390px] md:translate-y-2 md:pr-5">
          <div className="mb-5">
            <h1 className="max-w-[390px] text-[29px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-[32px]">
              Nền tảng học tập &amp; đánh giá vấn đáp thông minh bằng AI.
            </h1>
            <p className="mt-1 text-[12px] leading-[18px] text-[#626262]">
              Hệ thống phân tích phổ âm học thời gian thực với độ trễ thấp &lt;15s.
              Kết hợp Acoustic-LLM chấm điểm tự động đa chiều theo khung năng lực
              chuẩn CEFR và Rubric đào tạo quốc gia.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5e5e5] bg-white px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6b6cff]" />
                <h2 className="whitespace-nowrap text-[9px] font-semibold">
                  Kiểm tra giọng nói trước khi vào phòng thi
                </h2>
              </div>
              <span className="whitespace-nowrap rounded-full border border-[#b8e4cb] bg-[#e8f7ed] px-1.5 py-0.5 text-[7px] font-semibold text-[#087b48]">
                Chuẩn âm phòng lab 48kHz
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-[#ededed] pt-2.5 text-[8px] text-[#777]">
              <span>Thử âm phổ thoại (Speech Spectral Feed):</span>
              <span className="text-[9px] font-semibold text-[#222]">-18.4 dBFS (Tối ưu)</span>
            </div>
            <div
              className="mt-1.5 flex h-[29px] items-center justify-center gap-[7px] rounded-lg bg-[#f3f3f3] px-3"
              aria-label="Minh họa phổ âm thanh"
            >
              {[7, 12, 9, 15, 10, 18, 12, 8, 14, 6, 11, 17, 9, 13, 6, 10, 15, 8, 12, 5, 9, 14, 7, 11, 6, 13].map(
                (height, index) => (
                  <span
                    key={index}
                    className={`w-[2px] shrink-0 rounded-full ${
                      index % 6 === 3 ? 'bg-[#6b6cff]' : 'bg-[#282828]'
                    }`}
                    style={{ height }}
                  />
                ),
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[8px] text-[#666]">
              <span className="flex items-center gap-1">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 text-[#087b48]" fill="none">
                  <rect x="5.5" y="2.5" width="5" height="8" rx="2.5" stroke="currentColor" />
                  <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2M6 14h4" stroke="currentColor" strokeLinecap="round" />
                </svg>
                Microphone: Built-in Array (CoreAudio)
              </span>
              <button type="button" className="font-semibold text-[#333] underline underline-offset-2">
                Chạy thử lại (5s)
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-[#e4e4e4] border-t border-[#e4e4e4] py-3">
            <div className="flex items-center gap-1.5 pr-2">
              <span className="text-[14px] font-bold">50+</span>
              <span className="text-[8px] leading-[10px] text-[#555]">Trường Đại học tin dùng</span>
            </div>
            <div className="flex items-center gap-1.5 px-2">
              <span className="text-[14px] font-bold">150,000+</span>
              <span className="text-[8px] leading-[10px] text-[#555]">Bài thi vấn đáp đã phân tích</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2">
              <span className="text-[14px] font-bold text-[#087b48]">99.4%</span>
              <span className="text-[8px] leading-[10px] text-[#555]">Độ tương thích Rubric chuẩn</span>
            </div>
          </div>

          <figure className="rounded-xl border border-[#e7e7e7] bg-[#f1f1f1] px-3 py-2.5">
            <blockquote className="flex gap-2 text-[9px] italic leading-[14px] text-[#444]">
              <span className="text-[15px] font-bold not-italic">“</span>
              <span>
                AIOralCheck giải quyết hoàn toàn nút thắt chấm thi vấn đáp quy mô
                lớn. Sinh viên nhận phản hồi ngữ âm và cấu trúc luận điểm ngay sau
                buổi thi mà không phải chờ đợi nhiều tuần.
              </span>
            </blockquote>
            <figcaption className="mt-1 flex items-center justify-between pl-5 text-[8px]">
              <span className="font-semibold">PGS. TS. Trần Minh Tuấn</span>
              <span className="text-[7px] font-semibold text-[#555]">
                TRƯỞNG BỘ MÔN CNPM - ĐH BÁCH KHOA
              </span>
            </figcaption>
          </figure>
        </section>

        <section className="w-full md:pl-0">
          <div className="mx-auto w-full max-w-[376px] overflow-hidden rounded-2xl border border-[#e7e7e7] bg-white shadow-[0_3px_12px_rgba(0,0,0,0.06)] md:ml-0">
            <div className="h-[3px] bg-gradient-to-r from-[#171717] via-[#7168ff] to-[#171717]" />
            <div className="px-5 pb-5 pt-[17px]">
              <nav
                aria-label="Tài khoản"
                className="grid h-[32px] grid-cols-2 rounded-lg bg-[#eeeeee] p-[3px] text-[9px]"
              >
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-md text-[#555] transition hover:bg-white"
                >
                  Đăng nhập
                </Link>
                <span
                  aria-current="page"
                  className="flex items-center justify-center rounded-md bg-white font-semibold shadow-sm"
                >
                  Đăng ký tài khoản
                </span>
              </nav>

              <form className="mt-2" onSubmit={handleSubmit}>
                <div className="mb-2 flex items-center justify-between gap-2 text-[8px] font-semibold">
                  <span className="text-[#555]">CHỌN VAI TRÒ NGƯỜI DÙNG (BẮT BUỘC)</span>
                  <span className="rounded-full border border-[#a7ddbd] bg-[#e9f8ef] px-1.5 py-0.5 text-[7px] text-[#087b48]">
                    {role === 'student' ? 'SINH VIÊN' : 'GIẢNG VIÊN'}
                  </span>
                </div>
                <div role="group" aria-label="Vai trò người dùng" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={role === 'student'}
                    onClick={() => setRole('student')}
                    className={`min-h-[57px] rounded-lg border px-2 py-1.5 text-left transition ${
                      role === 'student'
                        ? 'border-[#222] bg-[#f7f7f7] ring-1 ring-[#222]/10'
                        : 'border-[#e2e2e2] bg-white hover:bg-[#fafafa]'
                    }`}
                  >
                    <span className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1">
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                          <path d="m2 6 6-3 6 3-6 3-6-3Z M4 7v3c2 2 6 2 8 0V7M14 6v4" stroke="currentColor" strokeLinejoin="round" />
                        </svg>
                        Sinh viên
                      </span>
                      {role === 'student' && <span aria-hidden="true">⊙</span>}
                    </span>
                    <span className="mt-1 block text-[8px] leading-[11px] text-[#666]">
                      Luyện tập vấn đáp, nộp bài ghi âm &amp; nhận phân tích AI tức thì.
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={role === 'teacher'}
                    onClick={() => setRole('teacher')}
                    className={`min-h-[57px] rounded-lg border px-2 py-1.5 text-left transition ${
                      role === 'teacher'
                        ? 'border-[#222] bg-[#f7f7f7] ring-1 ring-[#222]/10'
                        : 'border-[#e2e2e2] bg-white hover:bg-[#fafafa]'
                    }`}
                  >
                    <span className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1">
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                          <path d="M2.5 4.5h11v8h-11zM5 2.5h6M5 7h6M5 9.5h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Giảng viên
                      </span>
                      {role === 'teacher' && <span aria-hidden="true">⊙</span>}
                    </span>
                    <span className="mt-1 block text-[8px] leading-[11px] text-[#666]">
                      Quản lý lớp học, thiết lập rubric tiêu chuẩn &amp; thẩm định điểm.
                    </span>
                  </button>
                </div>

                <div className="mt-3 space-y-[5px]">
                  <div>
                    <label htmlFor="institutional-id" className="mb-1 flex items-center justify-between text-[9px] font-semibold">
                      <span>Mã số {role === 'student' ? 'Sinh viên (MSSV)' : 'Giảng viên (MSGV)'}</span>
                      <span className="font-normal text-[#777]">Cấp bởi Phòng Đào tạo</span>
                    </label>
                    <input
                      id="institutional-id"
                      name="institutionalId"
                      type="text"
                      autoComplete="off"
                      required
                      className={fieldClassName}
                      placeholder="Ví dụ: 2021601234"
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="mb-1 block text-[9px] font-semibold">
                      Email
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={fieldClassName}
                      placeholder="ten@uit.edu.vn"
                    />
                  </div>

                  <div>
                    <label htmlFor="full-name" className="mb-1 block text-[9px] font-semibold">
                      Họ tên
                    </label>
                    <input
                      id="full-name"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      className={fieldClassName}
                      placeholder="Ví dụ: Nguyễn Văn A"
                    />
                  </div>

                  <div>
                    <label htmlFor="faculty" className="mb-1 flex items-center justify-between text-[9px] font-semibold">
                      <span>Khoa</span>
                      <span className="font-normal text-[#777]">Ví dụ: Khoa CNTT</span>
                    </label>
                    <select id="faculty" name="faculty" required defaultValue="" className={`${fieldClassName} appearance-auto text-[#777]`}>
                      <option value="" disabled>
                        Chọn khoa
                      </option>
                      <option value="Khoa Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
                      <option value="Khoa Hệ thống Thông tin">Khoa Hệ thống Thông tin</option>
                      <option value="Khoa Khoa học Máy tính">Khoa Khoa học Máy tính</option>
                      <option value="Khoa khác">Khoa khác</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1 block text-[9px] font-semibold">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={`${fieldClassName} pr-9`}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[#777] hover:text-[#222]"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                          <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" stroke="currentColor" />
                          <circle cx="8" cy="8" r="1.7" stroke="currentColor" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-0.5 text-right text-[8px] text-[#777]">
                      <Link href="/login" className="hover:underline">
                        Quên mật khẩu?
                      </Link>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="mb-1 block text-[9px] font-semibold">
                      Xác nhận lại mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={`${fieldClassName} pr-9`}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[#777] hover:text-[#222]"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                          <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" stroke="currentColor" />
                          <circle cx="8" cy="8" r="1.7" stroke="currentColor" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <label className="mt-3 flex cursor-pointer items-start gap-1.5 text-[8px] leading-[11px] text-[#555]">
                  <input
                    type="checkbox"
                    name="terms"
                    required
                    className="mt-[1px] h-[11px] w-[11px] shrink-0 rounded border-[#c7c7c7] accent-[#111]"
                  />
                  <span>
                    Tôi đồng ý tuân thủ Quy chế thi trực tuyến và chính sách mã hóa
                    bảo mật bản ghi âm giọng nói theo tiêu chuẩn FERPA &amp; GDPR.
                  </span>
                </label>

                {errorMessage && (
                  <p role="alert" className="mt-3 rounded-lg border border-[#f1c7c7] bg-[#fff1f0] px-3 py-2 text-[10px] leading-4 text-[#a12622]">
                    {errorMessage}
                  </p>
                )}
                {successMessage && (
                  <p role="status" className="mt-3 rounded-lg border border-[#b8e4cb] bg-[#e8f7ed] px-3 py-2 text-[10px] leading-4 text-[#087b48]">
                    {successMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-[32px] w-full items-center justify-center gap-1.5 rounded-full bg-[#111315] text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#292b2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b6cff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    'Đang tạo tài khoản...'
                  ) : (
                    <>
                      Đăng ký tài khoản {role === 'student' ? 'Sinh viên' : 'Giảng viên'}
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                <div className="my-[12.5px] flex items-center gap-2 text-[8px] text-[#555]">
                  <span className="h-px flex-1 bg-[#e8e8e8]" />
                  <span>ĐĂNG KÝ QUA SSO CHƯA ĐƯỢC CẤU HÌNH</span>
                  <span className="h-px flex-1 bg-[#e8e8e8]" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled
                    title="Đăng ký qua SSO chưa được cấu hình"
                    className="flex h-[32px] cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#fafafa] text-[8px] font-medium opacity-60"
                  >
                    <span className="text-[11px] font-bold text-[#4285f4]">G</span>
                    Google Workspace Edu
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Đăng ký qua SSO chưa được cấu hình"
                    className="flex h-[32px] cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-[#fafafa] text-[8px] font-medium opacity-60"
                  >
                    <span className="text-[11px] font-bold text-[#00a4ef]">▦</span>
                    Microsoft 365 Edu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex min-h-[42px] flex-wrap items-center justify-between gap-2 border-t border-[#e6e6e6] px-4 py-2 text-[8px] text-[#555] sm:px-[26px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-[#222]">© 2024 AIOralCheck.</span>
          <span>Bản quyền thuộc về Viện Nghiên cứu Khảo thí Ngôn ngữ &amp; Trí tuệ Nhân tạo.</span>
        </div>
        <nav aria-label="Liên kết thông tin" className="flex items-center gap-4">
          <span className="h-[5px] w-[5px] rounded-full bg-[#087b48]" />
          <Link href="/signup" className="underline underline-offset-2">
            Quy chuẩn dữ liệu âm thanh
          </Link>
          <Link href="/signup" className="underline underline-offset-2">
            Điều khoản dịch vụ
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export default Signup;
