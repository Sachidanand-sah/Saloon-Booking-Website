'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Flower2, Hand, Scissors, Sparkles, Star, X, type LucideIcon } from 'lucide-react';
import { cn, initials } from '@/lib/format';
import type { BookingStatus } from '@/lib/types';

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">{title}</h2>
      {intro ? <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p> : null}
    </div>
  );
}

const tones = {
  neutral: 'bg-sand text-plum-800',
  plum: 'bg-plum-100 text-plum-800',
  rose: 'bg-rose-100 text-rose-600',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

const statusTone: Record<BookingStatus, keyof typeof tones> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'plum',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
};
const statusLabel: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
};

export const StatusBadge = ({ status }: { status: BookingStatus }) => (
  <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-xl bg-linen/70', className)} aria-hidden />
);

export function Stars({ value, size = 'sm', className }: { value: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(size === 'sm' ? 'size-3.5' : 'size-5', i <= Math.round(value) ? 'fill-rose-500 text-rose-500' : 'text-linen')}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs from any host
    return <img src={src} alt={name} className={cn('rounded-full object-cover', className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-plum-100 font-display font-semibold text-plum-700',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

const art: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  hair: { icon: Scissors, from: 'from-plum-700', to: 'to-rose-500' },
  skin: { icon: Sparkles, from: 'from-rose-500', to: 'to-rose-300' },
  nails: { icon: Hand, from: 'from-plum-500', to: 'to-rose-300' },
  spa: { icon: Flower2, from: 'from-plum-900', to: 'to-plum-500' },
};

/** Service photo when one is set, otherwise a branded gradient with the category icon. */
export function ServiceArt({
  category,
  imageUrl,
  name,
  className,
}: {
  category?: string;
  imageUrl?: string | null;
  name: string;
  className?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided URLs from any host
    return <img src={imageUrl} alt={name} loading="lazy" className={cn("object-cover", className)} />;
  }
  const a = art[category ?? ''] ?? art.skin;
  const Icon = a.icon;
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', a.from, a.to, className)} aria-hidden>
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-4 size-28 rounded-full bg-white/10" />
      <Icon className="absolute bottom-4 right-4 size-10 text-white/80" strokeWidth={1.25} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-xl">{title}</h3>
      {children ? <div className="mt-2 max-w-sm text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Accessible modal built on <dialog> (focus trap, Esc to close). */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={e => e.target === ref.current && onClose()}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 text-ink shadow-lift backdrop:bg-plum-900/50 backdrop:backdrop-blur-sm',
        wide ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      {open ? (
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-2xl">{title}</h2>
            <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-sand" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
