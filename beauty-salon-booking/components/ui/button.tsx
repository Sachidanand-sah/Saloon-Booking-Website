import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/format';

const variants = {
  primary: 'bg-plum-900 text-white hover:bg-plum-700 shadow-soft',
  accent: 'bg-rose-500 text-white hover:bg-rose-600 shadow-soft',
  outline: 'border border-plum-200 bg-white text-plum-900 hover:border-plum-300 hover:bg-plum-50',
  ghost: 'text-plum-800 hover:bg-plum-50',
  light: 'bg-white text-plum-900 hover:bg-ivory shadow-soft',
  danger: 'bg-danger text-white hover:brightness-110',
};

const sizes = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2',
};

type Common = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

export function buttonClass({ variant = 'primary', size = 'md', className }: Omit<Common, 'children'>) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-all duration-200',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...props
}: Common & ComponentProps<'button'>) {
  return (
    <button className={buttonClass({ variant, size, className })} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
