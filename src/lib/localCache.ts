import type { Session, User } from '@supabase/supabase-js';

const AUTH_TOKEN_SUFFIX = '-auth-token';
const PRIMARY_AUTH_STORAGE_KEY = 'sb-evuswzfmrfkmlcdsphgu-auth-token';

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function removeStorageKeys(keys: string[]) {
  if (typeof window === 'undefined') return;

  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

function parseStoredSession(raw: string | null): Session | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return (parsed?.currentSession || parsed?.session || parsed || null) as Session | null;
  } catch {
    return null;
  }
}

export function getStoredSession(): Session | null {
  if (typeof window === 'undefined') return null;

  const candidateKeys = [
    PRIMARY_AUTH_STORAGE_KEY,
    ...Object.keys(window.localStorage).filter(
      (key) => key.startsWith('sb-') && key.endsWith(AUTH_TOKEN_SUFFIX),
    ),
  ];

  for (const key of candidateKeys) {
    const session = parseStoredSession(window.localStorage.getItem(key));
    if (session?.user) return session;
  }

  return null;
}

export function getStoredUser(): User | null {
  return getStoredSession()?.user ?? null;
}