'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  Crown,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PartyPopper,
  Scissors,
  ShoppingBag,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAdminInbox, type AdminInbox } from '@/components/admin/extras';
import { useSession, useToast } from '@/components/providers';
import { Avatar } from '@/components/ui/misc';
import { errorMessage } from '@/lib/client';
import { cn } from '@/lib/format';
import { site } from '@/lib/site';

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: keyof AdminInbox; badgeLabel?: string };

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Manage',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
      { href: '/admin/services', label: 'Services', icon: Scissors },
      { href: '/admin/staff', label: 'Team', icon: Users },
      { href: '/admin/branches', label: 'Branches', icon: MapPin },
    ],
  },
  {
    heading: 'Grow',
    items: [
      { href: '/admin/packages', label: 'Packages', icon: Crown, badge: 'pendingMemberships', badgeLabel: 'awaiting payment' },
      { href: '/admin/events', label: 'Events', icon: PartyPopper, badge: 'newEventRequests', badgeLabel: 'new requests' },
      { href: '/admin/products', label: 'Shop', icon: ShoppingBag, badge: 'pendingReservations', badgeLabel: 'to prepare' },
      { href: '/admin/customers', label: 'Customers', icon: UserRound },
    ],
  },
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
  const inbox = useAdminInbox();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  return (
    <nav aria-label="Admin" className="space-y-6">
      {NAV.map(group => (
        <div key={group.heading}>
          <p className="px-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">{group.heading}</p>
          <ul className="mt-2 space-y-1">
            {group.items.map(({ href, label, icon: Icon, badge, badgeLabel }) => {
              const active = isActive(href);
              const count = badge ? (inbox.data?.[badge] ?? 0) : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                      active ? 'bg-plum-900 text-white shadow-soft' : 'text-plum-800 hover:bg-plum-50 hover:text-plum-900',
                    )}
                  >
                    <Icon className={cn('size-[1.15rem]', active ? 'text-rose-300' : 'text-plum-500 group-hover:text-rose-500')} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          'min-w-5 rounded-full px-1.5 text-center text-xs font-semibold leading-5',
                          active ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600',
                        )}
                      >
                        {count}
                        <span className="sr-only"> {badgeLabel}</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-plum-50 hover:text-plum-900"
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
        <div className="no-scrollbar mt-8 min-h-0 flex-1 overflow-y-auto pb-4">
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
