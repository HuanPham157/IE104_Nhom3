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

  const { data, error } = await supabase
    .from('profiles')
    .select('role,full_name,institutional_id,faculty')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const profile: CachedProfile = {
    role: data?.role ?? null,
    full_name: data?.full_name ?? null,
    institutional_id: data?.institutional_id ?? null,
    faculty: data?.faculty ?? null,
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
