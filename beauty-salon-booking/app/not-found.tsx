import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="hero-glow flex min-h-dvh flex-col items-center justify-center px-4 text-center text-white">
      <p className="eyebrow !text-rose-300">Error 404</p>
      <h1 className="mt-4 text-5xl !text-white sm:text-6xl">Page not found</h1>
      <p className="mt-4 max-w-md text-white/70">The page you are looking for has moved or no longer exists.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={buttonClass({ variant: 'light' })}>Back to home</Link>
        <Link href="/book" className={buttonClass({ variant: 'ghost', className: '!text-white hover:!bg-white/10' })}>Book now</Link>
      </div>
    </div>
  );
}
