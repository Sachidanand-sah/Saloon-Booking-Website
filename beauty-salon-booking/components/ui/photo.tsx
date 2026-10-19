'use client';

import { useState } from 'react';
import { Droplets, PartyPopper, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/format';

const fallbacks: Record<'product' | 'event', { icon: LucideIcon; bg: string }> = {
  product: { icon: Droplets, bg: 'from-rose-100 via-sand to-plum-100' },
  event: { icon: PartyPopper, bg: 'from-plum-700 via-plum-500 to-rose-300' },
};

/** Product or event photo with a branded gradient when there is no image (or it fails to load). */
export function Photo({
  src,
  alt,
  kind,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  kind: 'product' | 'event';
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (src && failed !== src) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-managed URLs from any host
    return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(src)} className={cn('object-cover', className)} />;
  }
  const f = fallbacks[kind];
  const Icon = f.icon;
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', f.bg, className)} role="img" aria-label={alt}>
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/20" />
      <div className="absolute -bottom-10 -left-4 size-28 rounded-full bg-white/20" />
      <Icon
        className={cn('absolute bottom-4 right-4 size-10', kind === 'event' ? 'text-white/80' : 'text-plum-500/50')}
        strokeWidth={1.25}
        aria-hidden
      />
    </div>
  );
}
