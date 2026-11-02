'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import TeacherSidebar from '@/components/TeacherSidebar';

export interface TeacherPageProfile {
  fullName: string;
  institutionalId: string;
  faculty: string;
  email: string;
}

interface TeacherPageShellProps {
  currentPage: 'classes' | 'profile' | 'settings';
  breadcrumb: string;
  children: (profile: TeacherPageProfile) => ReactNode;
}

export default function TeacherPageShell({ currentPage, breadcrumb, children }: TeacherPageShellProps) {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('teacher'));
  const [profile, setProfile] = useState<TeacherPageProfile | null>(() => cachedProfile ? {
    fullName: cachedProfile.full_name ?? '',
    institutionalId: cachedProfile.institutional_id ?? '',
    faculty: cachedProfile.faculty ?? '',
    email: '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [errorMessage, setErrorMessage] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkTeacherAccess() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }

        const teacherProfile = await getCachedProfile(session.user.id);
        if (teacherProfile.role !== 'teacher') {
          router.replace(teacherProfile.role === 'student' ? '/student' : '/login');
          return;
        }
        if (active) {
          setProfile({
            fullName: teacherProfile.full_name ?? '',
            institutionalId: teacherProfile.institutional_id ?? '',
            faculty: teacherProfile.faculty ?? '',
            email: session.user.email ?? '',
          });
        }
      } catch {
        if (active) setErrorMessage('Không thể xác minh tài khoản giảng viên. Vui lòng kiểm tra kết nối và thử lại.');
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkTeacherAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/login');
      router.refresh();
    } catch {
      setErrorMessage('Đăng xuất chưa thành công. Vui lòng thử lại.');
      setSigningOut(false);
    }
  }

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-sm text-gray-600">Đang xác minh tài khoản giảng viên...</main>;
  }
  if (errorMessage && !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-5">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <p role="alert" className="text-sm text-red-700">{errorMessage}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white">Thử lại</button>
        </div>
      </main>
    );
  }
  if (!profile) return null;

  const name = profile.fullName || 'Giảng viên';
  const initials = name.split(/\s+/).slice(-2).map((part) => part[0]?.toLocaleUpperCase() ?? '').join('');
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <TeacherSidebar
        currentPage={currentPage}
        signingOut={signingOut}
        onSignOut={handleSignOut}
        unavailableItemsInteractive={false}
        onUnavailable={() => undefined}
      />
      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="min-w-0 text-[11px] text-gray-500">Giảng viên <span className="mx-1">/</span>{breadcrumb}</div>
          <div className="flex items-center gap-2">
            <nav aria-label="Chế độ dashboard giảng viên" className="flex items-center rounded-full border border-gray-200 bg-gray-100 p-1 text-[10px]">
              <Link href="/teacher" className="rounded-full px-3 py-1.5 text-gray-600 hover:bg-white">Dashboard tổng quan</Link>
              <Link href="/teacher/profile" aria-current={currentPage === 'profile' ? 'page' : undefined} className={`rounded-full px-3 py-1.5 ${currentPage === 'profile' ? 'bg-white font-semibold shadow-sm' : 'text-gray-600 hover:bg-white'}`}>Dashboard hồ sơ</Link>
            </nav>
            <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#efefff] text-[10px] font-bold text-indigo-800 sm:flex" aria-label={`Tài khoản ${name}`}>{initials}</span>
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 sm:px-7 sm:pt-6">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          {children(profile)}
        </div>
      </div>
    </main>
  );
}
