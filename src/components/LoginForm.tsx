'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Tài khoản chưa được xác nhận email. Hãy kiểm tra cài đặt trong Supabase Auth.');
        } else {
          setErrorMessage(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Đăng nhập thành công, chuyển hướng vào trang quản lý công việc
        router.push('/tasks');
      }
    } catch {
      setErrorMessage('Không thể kết nối đến máy chủ xác thực. Kiểm tra mạng hoặc biến môi trường .env.local.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f9f9ff] text-[#111c2d] font-sans antialiased">
      {/* CỘT TRÁI: Branding & Storytelling theo thiết kế Stitch */}
      <section className="lg:w-1/2 w-full bg-gradient-to-br from-[#1E1B4B] via-[#241E66] to-[#312E81] text-white p-8 lg:p-12 xl:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#6029c9]/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 rounded-full bg-[#4338ca]/40 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[#e3dfff] text-2xl shadow-inner">
              🎙️
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                OralEval IE104
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#e9ddff] text-[#23005c] border border-[#d0bcff]/40">
                  AI Powered
                </span>
              </span>
              <p className="text-xs text-[#d8e3fb] font-medium">Hệ thống Đánh giá Vấn đáp Trực tuyến Thông minh</p>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#c3c0ff] text-xs font-semibold">
            <span>🏫</span>
            <span>Được tối ưu cho môn IE104 - UIT (ĐHQG-HCM)</span>
          </div>
        </div>

        {/* Live Audio Simulation Box */}
        <div className="my-8 relative z-10 w-full max-w-lg mx-auto lg:mx-0 bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-semibold tracking-wider text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              LIVE RECORDING #SESSION-829
            </span>
            <span className="text-xs font-mono text-[#dee8ff] bg-white/10 px-2 py-0.5 rounded">02:47.38</span>
          </div>

          <div className="bg-[#263143]/80 rounded-xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-[#d8e3fb] mb-2">
              <span>Phổ tần số âm thanh giọng nói</span>
              <span className="text-[#4edea3] font-mono text-[10px]">48kHz • 24-bit Lossless</span>
            </div>
            <div className="h-10 flex items-center justify-center gap-1.5 px-2">
              <span className="w-1.5 h-6 bg-[#cbd5e1] rounded-full animate-pulse" />
              <span className="w-1.5 h-9 bg-[#e3dfff] rounded-full animate-pulse" />
              <span className="w-1.5 h-7 bg-[#4edea3] rounded-full animate-pulse" />
              <span className="w-1.5 h-10 bg-[#c3c0ff] rounded-full animate-pulse" />
              <span className="w-1.5 h-5 bg-[#f59e0b] rounded-full animate-pulse" />
              <span className="w-1.5 h-8 bg-[#4edea3] rounded-full animate-pulse" />
              <span className="w-1.5 h-4 bg-[#cbd5e1] rounded-full animate-pulse" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/10 border border-white/20 text-xs">
            <div className="flex items-center justify-between font-semibold text-white">
              <span>Chấm điểm Barem IE104</span>
              <span className="text-[#6cf8bb] bg-[#006c49]/40 px-2 py-0.5 rounded font-mono">9.5/10</span>
            </div>
            <p className="text-[#d8e3fb] mt-1 text-[11px] leading-relaxed">
              Phát hiện thuật ngữ: &quot;ACID transactions&quot;, &quot;CAP theorem&quot;. Độ trôi chảy đạt 94.2%.
            </p>
          </div>
        </div>

        {/* 3 Core Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 pt-4 border-t border-white/15 text-xs">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="font-semibold text-white">Phân tích Realtime</div>
            <p className="text-[#d8e3fb] text-[11px] mt-0.5">Bóc tách transcript tức thời.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="font-semibold text-white">Chuẩn Barem Khoa</div>
            <p className="text-[#d8e3fb] text-[11px] mt-0.5">Đối soát rubric chuẩn xác.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="font-semibold text-white">Tiết kiệm 85%</div>
            <p className="text-[#d8e3fb] text-[11px] mt-0.5">Rút ngắn thời gian chấm.</p>
          </div>
        </div>

        <div className="mt-6 pt-3 flex items-center justify-between text-[#d8e3fb]/80 text-xs relative z-10">
          <span>Bản quyền © 2026 ĐH Công nghệ Thông tin - ĐHQG-HCM</span>
          <span className="font-mono text-[10px]">v2.4.1-stable</span>
        </div>
      </section>

      {/* CỘT PHẢI: Form Đăng nhập Supabase Auth thật */}
      <section className="lg:w-1/2 w-full bg-white flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          <div>
            <div className="inline-flex items-center gap-1 text-[#2a14b4] text-xs font-semibold uppercase tracking-wider mb-1">
              🛡️ HỆ THỐNG KHẢO THÍ CHÍNH THỨC
            </div>
            <h1 className="text-3xl font-bold text-[#111c2d] tracking-tight">Đăng nhập</h1>
            <p className="text-sm text-[#464554] mt-1">Đăng nhập tài khoản để quản lý Việc học của tôi</p>
          </div>

          {/* Chọn vai trò */}
          <div>
            <label className="block text-xs font-semibold text-[#464554] mb-2">Vai trò truy cập của bạn</label>
            <div className="grid grid-cols-3 p-1 rounded-xl bg-[#f0f3ff] border border-[#c7c4d7]/60">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'student' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554] hover:text-[#111c2d]'
                }`}
              >
                🎓 Sinh viên
              </button>
              <button
                type="button"
                onClick={() => setRole('lecturer')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'lecturer' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554] hover:text-[#111c2d]'
                }`}
              >
                👨‍🏫 Giảng viên
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  role === 'admin' ? 'bg-white text-[#2a14b4] shadow-sm' : 'text-[#464554] hover:text-[#111c2d]'
                }`}
              >
                ⚙️ Quản trị viên
              </button>
            </div>
          </div>

          {/* Hiển thị lỗi xác thực nếu có */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form nhập tài khoản */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-[#111c2d] mb-1.5" htmlFor="email-input">
                Email tài khoản <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                id="email-input"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg border border-[#c7c4d7] bg-white px-3.5 py-2.5 text-sm text-[#111c2d] placeholder-[#777586] focus:border-[#2a14b4] focus:ring-2 focus:ring-[#2a14b4]/20 outline-none transition-colors disabled:opacity-50"
                placeholder="usera@gm.uit.edu.vn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111c2d] mb-1.5" htmlFor="password-input">
                Mật khẩu <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#c7c4d7] bg-white px-3.5 py-2.5 pr-12 text-sm text-[#111c2d] placeholder-[#777586] focus:border-[#2a14b4] focus:ring-2 focus:ring-[#2a14b4]/20 outline-none transition-colors disabled:opacity-50"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  aria-label="Hiện hoặc ẩn mật khẩu"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-xs text-[#777586] hover:text-[#111c2d]"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#2a14b4] hover:bg-[#372abf] text-white text-sm font-semibold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng nhập ngay</span>
                  <span>→</span>
                </>
              )}
            </button>
            <Link
              href="/signup"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-[#2a14b4] bg-white text-sm font-semibold text-[#2a14b4] transition-colors hover:bg-[#f5f3ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a14b4]"
            >
              Đăng ký tài khoản
            </Link>
          </form>

          <div className="pt-2 text-center text-xs text-[#464554]">
            Hệ thống kết nối xác thực qua Supabase Auth (Bài thực hành 2)
          </div>
        </div>
      </section>
    </main>
  );
}