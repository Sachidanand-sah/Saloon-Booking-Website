'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, MapPin, Menu, Scissors, Users, X, type LucideIcon } from 'lucide-react';
import { useSession, useToast } from '@/components/providers';
import { Avatar } from '@/components/ui/misc';
import { errorMessage } from '@/lib/client';
import { cn } from '@/lib/format';
import { site } from '@/lib/site';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/admin/services', label: 'Services', icon: Scissors },
  { href: '/admin/staff', label: 'Team', icon: Users },
  { href: '/admin/branches', label: 'Branches', icon: MapPin },
];

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="font-display text-2xl font-semibold text-plum-900">{site.name}</span>
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-rose-600">
        Admin
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  return (
    <nav aria-label="Admin" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
              active ? 'bg-plum-900 text-white shadow-soft' : 'text-plum-800 hover:bg-plum-50 hover:text-plum-900',
            )}
          >
            <Icon className={cn('size-[1.15rem]', active ? 'text-rose-300' : 'text-plum-500 group-hover:text-rose-500')} aria-hidden />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-plum-50 hover:text-plum-900"
      >
        <ExternalLink className="size-[1.15rem]" aria-hidden />
        View website
      </Link>
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      router.push('/');
    } catch (e) {
      toast(errorMessage(e), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-ivory/70 p-3">
      <Avatar name={user?.name ?? 'Admin'} className="size-10 shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-plum-900">{user?.name ?? 'Signed in'}</p>
        <p className="truncate text-xs text-muted">{user?.email ?? 'Administrator'}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        disabled={busy}
        aria-label="Log out"
        title="Log out"
        className="rounded-full p-2 text-plum-700 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-ivory">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white/80 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <p className="mt-8 px-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">Manage</p>
        <div className="mt-2 flex-1">
          <NavLinks />
        </div>
        <UserCard />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-full p-2 text-plum-900 hover:bg-plum-50"
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 top-16 z-20 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 animate-fade-in bg-plum-900/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            id="admin-mobile-nav"
            className="relative flex max-h-full animate-fade-in flex-col gap-6 overflow-y-auto border-b border-line bg-white px-4 py-5 shadow-lift"
          >
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserCard />
          </div>
        </div>
      ) : null}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
