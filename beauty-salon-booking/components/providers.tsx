'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { sessionApi } from '@/lib/client';
import type { User } from '@/lib/types';

// ---------- Session ----------

type SessionValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (data: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ['session'],
    queryFn: sessionApi.get,
    staleTime: 5 * 60_000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await sessionApi.login({ email, password });
      qc.setQueryData(['session'], { user });
      return user;
    },
    [qc],
  );
  const signup = useCallback(
    async (body: { name: string; email: string; password: string; phone?: string }) => {
      const { user } = await sessionApi.signup(body);
      qc.setQueryData(['session'], { user });
      return user;
    },
    [qc],
  );
  const logout = useCallback(async () => {
    await sessionApi.logout();
    qc.clear();
    qc.setQueryData(['session'], { user: null });
  }, [qc]);

  const value = useMemo(
    () => ({ user: data?.user ?? null, loading: isPending, login, signup, logout }),
    [data, isPending, login, signup, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <Providers>');
  return ctx;
}

// ---------- Toasts ----------

type Toast = { id: number; tone: 'success' | 'error'; message: string };
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts(t => t.filter(x => x.id !== id));
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, tone, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl bg-plum-900 px-4 py-3 text-sm text-white shadow-lift"
          >
            {t.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-rose-300" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-300" />
            )}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-white/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------- Root ----------

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
