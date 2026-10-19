'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Gift, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import { useSession } from '@/components/providers';
import { ButtonLink } from '@/components/ui/button';
import { BagButton } from '@/components/shop/bag-button';
import { cn } from '@/lib/format';
import { site } from '@/lib/site';

const links = [
  { href: '/services', label: 'Services' },
  { href: '/packages', label: 'Packages' },
  { href: '/events', label: 'Events' },
  { href: '/products', label: 'Shop' },
  { href: '/locations', label: 'Locations' },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-baseline gap-2" aria-label={`${site.name} home`}>
      <span className={cn('font-display text-2xl font-semibold tracking-tight', light ? 'text-white' : 'text-plum-900')}>
        {site.name}
      </span>
      <span className="hidden size-1.5 rounded-full bg-rose-500 transition-transform group-hover:scale-150 sm:block" />
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-medium text-plum-900 hover:bg-plum-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <User className="size-4" />
        </span>
        <span className="max-w-28 truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open ? (
        <div role="menu" className="card absolute right-0 top-12 w-56 animate-fade-in p-2">
          <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
          <MenuLink href="/account" icon={CalendarDays} onClick={() => setOpen(false)}>
            My bookings
          </MenuLink>
          <MenuLink href="/rewards" icon={Gift} onClick={() => setOpen(false)}>
            Rewards
          </MenuLink>
          {user.role === 'ADMIN' ? (
            <MenuLink href="/admin" icon={LayoutDashboard} onClick={() => setOpen(false)}>
              Admin dashboard
            </MenuLink>
          ) : null}
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push('/');
              router.refresh();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-plum-900 hover:bg-plum-50"
          >
            <LogOut className="size-4 text-muted" /> Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: typeof User;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-plum-900 hover:bg-plum-50"
    >
      <Icon className="size-4 text-muted" /> {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useSession();
  const [scrolled, setScrolled] = useState(false);
  // Remember which page the menu was opened on, so navigating anywhere closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const mobileOpen = menuOpenOn === pathname;
  const setMobileOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null);
  const overHero = pathname === '/' && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        overHero ? 'bg-transparent' : 'border-b border-line/70 bg-ivory/90 backdrop-blur-md',
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-4">
        <Logo light={overHero} />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-full px-3.5 py-2 text-sm font-medium transition-colors xl:px-4',
                overHero ? 'text-white/85 hover:text-white' : 'text-plum-800 hover:bg-plum-50',
                (pathname === l.href || pathname.startsWith(`${l.href}/`)) && !overHero && 'bg-plum-50',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <BagButton light={overHero} />
          {loading ? null : user ? (
            <div className={cn(overHero && '[&>div>button]:text-white [&>div>button:hover]:bg-white/10')}>
              <UserMenu />
            </div>
          ) : (
            <Link
              href="/login"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium',
                overHero ? 'text-white/85 hover:text-white' : 'text-plum-800 hover:bg-plum-50',
              )}
            >
              Log in
            </Link>
          )}
          <ButtonLink href="/book" variant={overHero ? 'light' : 'primary'}>
            Book now
          </ButtonLink>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <BagButton light={overHero} />
          <button
            className={cn('rounded-full p-2', overHero ? 'text-white' : 'text-plum-900')}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-line bg-ivory lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4" aria-label="Mobile">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="rounded-xl px-3 py-3 text-base font-medium text-plum-900 hover:bg-plum-50">
                {l.label}
              </Link>
            ))}
            <Link href="/rewards" className="rounded-xl px-3 py-3 text-base font-medium text-plum-900 hover:bg-plum-50">
              Rewards
            </Link>
            <div className="my-2 h-px bg-line" />
            {user ? (
              <>
                <Link href="/account" className="rounded-xl px-3 py-3 text-base font-medium text-plum-900 hover:bg-plum-50">
                  My account
                </Link>
                {user.role === 'ADMIN' ? (
                  <Link href="/admin" className="rounded-xl px-3 py-3 text-base font-medium text-plum-900 hover:bg-plum-50">
                    Admin dashboard
                  </Link>
                ) : null}
                <button
                  onClick={async () => {
                    await logout();
                    setMobileOpen(false);
                  }}
                  className="rounded-xl px-3 py-3 text-left text-base font-medium text-plum-900 hover:bg-plum-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-xl px-3 py-3 text-base font-medium text-plum-900 hover:bg-plum-50">
                Log in
              </Link>
            )}
            <ButtonLink href="/book" size="lg" className="mt-3 w-full">
              Book an appointment
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
