'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { bagCount, useBag } from '@/lib/bag';
import { cn } from '@/lib/format';

export function BagButton({ light, className }: { light?: boolean; className?: string }) {
  const count = bagCount(useBag());
  return (
    <Link
      href="/bag"
      aria-label={count ? `Your bag, ${count} item${count === 1 ? '' : 's'}` : 'Your bag'}
      className={cn(
        'relative flex size-10 items-center justify-center rounded-full transition-colors',
        light ? 'text-white hover:bg-white/10' : 'text-plum-900 hover:bg-plum-50',
        className,
      )}
    >
      <ShoppingBag className="size-5" />
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white ring-2 ring-ivory">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
