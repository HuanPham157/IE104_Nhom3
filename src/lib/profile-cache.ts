import { supabase } from '@/lib/supabase-browser';

export interface CachedProfile {
  role: string | null;
  full_name: string | null;
  institutional_id: string | null;
  faculty: string | null;
}

const cacheDurationMs = 60_000;
const profileCache = new Map<string, { profile: CachedProfile; expiresAt: number }>();
let signOutListenerRegistered = false;

export async function getCachedProfile(userId: string): Promise<CachedProfile> {
  if (typeof window !== 'undefined' && !signOutListenerRegistered) {
    signOutListenerRegistered = true;
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') profileCache.clear();
    });
  }

  const cached = profileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role,full_name,account_status')
    .eq('id', userId)
    .maybeSingle();

  if (userError) throw userError;

  if (!user || user.account_status !== 'active') {
    const profile: CachedProfile = {
      role: null,
      full_name: user?.full_name ?? null,
      institutional_id: null,
      faculty: null,
    };
    profileCache.set(userId, { profile, expiresAt: Date.now() + cacheDurationMs });
    return profile;
  }

  let institutionalId: string | null = null;
  let faculty: string | null = null;
  if (user.role === 'student') {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('student_code,department')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    institutionalId = data?.student_code ?? null;
    faculty = data?.department ?? null;
  } else if (user.role === 'lecturer') {
    const { data, error } = await supabase
      .from('lecturer_profiles')
      .select('lecturer_code,department')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    institutionalId = data?.lecturer_code ?? null;
    faculty = data?.department ?? null;
  }

  const profile: CachedProfile = {
    role: user.role === 'lecturer' ? 'teacher' : user.role,
    full_name: user.full_name,
    institutional_id: institutionalId,
    faculty,
  };
  profileCache.set(userId, { profile, expiresAt: Date.now() + cacheDurationMs });
  return profile;
}

export function getCachedProfileForRole(role: 'student' | 'teacher'): CachedProfile | null {
  if (typeof window === 'undefined') return null;

  for (const { profile, expiresAt } of profileCache.values()) {
    if (expiresAt > Date.now() && profile.role === role) return profile;
  }
  return null;
}
