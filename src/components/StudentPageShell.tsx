'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getCachedProfile, getCachedProfileForRole } from '@/lib/profile-cache';
import StudentSidebar from '@/components/StudentSidebar';

type StudentPage = 'classes' | 'recorder';

interface StudentProfile {
  full_name: string;
  institutional_id: string;
}

interface StudentPageShellProps {
  currentPage: StudentPage;
  breadcrumb: string;
  children: ReactNode;
}

export default function StudentPageShell({ currentPage, breadcrumb, children }: StudentPageShellProps) {
  const router = useRouter();
  const [cachedProfile] = useState(() => getCachedProfileForRole('student'));
  const [profile, setProfile] = useState<StudentProfile | null>(() => cachedProfile ? {
    full_name: cachedProfile.full_name ?? '',
    institutional_id: cachedProfile.institutional_id ?? '',
  } : null);
  const [checking, setChecking] = useState(!cachedProfile);
  const [errorMessage, setErrorMessage] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkStudentAccess() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.replace('/login');
          return;
        }

        const studentProfile = await getCachedProfile(session.user.id);
        if (studentProfile.role !== 'student') {
          router.replace(studentProfile.role === 'teacher' ? '/teacher' : '/login');
          return;
        }
        if (active) {
          setProfile({
            full_name: studentProfile.full_name ?? '',
            institutional_id: studentProfile.institutional_id ?? '',
          });
        }
      } catch {
        if (active) setErrorMessage('Không thể xác minh tài khoản. Vui lòng kiểm tra kết nối và thử lại.');
      } finally {
        if (active) setChecking(false);
      }
    }

    void checkStudentAccess();
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
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-sm text-gray-600">Đang xác minh tài khoản sinh viên...</main>;
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

  const name = profile.full_name || 'Sinh viên';
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-[#202124]">
      <StudentSidebar
        currentPage={currentPage}
        fullName={name}
        institutionalId={profile.institutional_id}
        signingOut={signingOut}
        interactiveUnavailable={false}
        onSignOut={handleSignOut}
        onUnavailable={() => undefined}
      />
      <div className="md:ml-[255px]">
        <header className="sticky top-0 z-10 flex min-h-[62px] items-center justify-between gap-3 border-b border-[#e5e5e5] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="min-w-0 text-[11px] text-gray-500">
            Sinh viên <span className="mx-1">›</span><b className="text-gray-800">{breadcrumb}</b>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-medium text-gray-700">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#087b48]" />
            Hệ thống: Ổn định
          </span>
        </header>
        <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-5 sm:px-8 sm:pt-6">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}
