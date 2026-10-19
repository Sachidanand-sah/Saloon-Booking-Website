import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, session } from '@/api/client';
import type { User } from '@/api/types';

type SignupInput = { name: string; email: string; password: string; phone?: string };

type AuthValue = {
  user: User | null;
  /** True while the saved session is being restored at launch. */
  restoring: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

type SessionResponse = { user: User; accessToken: string; refreshToken: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Restore the saved session; an expired one quietly signs the user out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await session.load()) {
          const me = await api.get<{ user: User }>('/auth/me');
          if (!cancelled) setUser(me.user);
        }
      } catch {
        await session.clear();
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    const off = session.onExpired(() => {
      setUser(null);
      qc.clear();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [qc]);

  const start = useCallback(async (res: SessionResponse) => {
    await session.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => start(await api.post<SessionResponse>('/auth/login', { email, password })),
    [start],
  );
  const signup = useCallback(
    async (data: SignupInput) => start(await api.post<SessionResponse>('/auth/signup', data)),
    [start],
  );
  const logout = useCallback(async () => {
    const refreshToken = session.refreshToken;
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined);
    await session.clear();
    qc.clear();
    setUser(null);
  }, [qc]);

  const value = useMemo(
    () => ({ user, restoring, login, signup, logout, setUser }),
    [user, restoring, login, signup, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
