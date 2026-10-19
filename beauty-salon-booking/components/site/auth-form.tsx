'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { CalendarCheck, Flower2, ShieldCheck, Sparkles } from 'lucide-react';
import { useSession } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { Input, fieldErrors } from '@/components/ui/field';
import { RequestError, errorMessage } from '@/lib/client';
import { site } from '@/lib/site';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ()-]{7,20})?$/, 'Please enter a valid phone number')
    .optional(),
  password: z.string().min(8, 'Use at least 8 characters'),
});

/** Only allow same-site relative redirects (no //evil.com or absolute URLs). */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { login, signup } = useSession();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = (mode === 'login' ? loginSchema : signupSchema).safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const data = parsed.data as z.infer<typeof signupSchema>;
      const user =
        mode === 'login'
          ? await login(data.email, data.password)
          : await signup({ ...data, phone: data.phone || undefined });
      router.replace(next ?? (user.role === 'ADMIN' ? '/admin' : '/account'));
      router.refresh();
    } catch (err) {
      if (err instanceof RequestError && err.details) setErrors(fieldErrors(err.details));
      setFormError(errorMessage(err));
      setPending(false);
    }
  };

  const otherHref = `${mode === 'login' ? '/signup' : '/login'}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hero-glow relative hidden flex-col justify-between overflow-hidden p-12 pt-32 text-white lg:flex">
        <Flower2 className="absolute -right-16 -top-10 size-80 text-white/5" strokeWidth={0.5} aria-hidden />
        <div>
          <p className="eyebrow !text-rose-300">{site.name}</p>
          <h2 className="mt-4 max-w-md text-5xl leading-tight !text-white">
            {mode === 'login' ? 'Welcome back.' : 'Your glow starts here.'}
          </h2>
          <p className="mt-5 max-w-sm text-white/70">
            {mode === 'login'
              ? 'Manage appointments, reschedule in seconds, and rebook your favourites.'
              : 'Create a free account to book online, manage your appointments and leave reviews.'}
          </p>
        </div>
        <ul className="space-y-4 text-sm text-white/80">
          <li className="flex items-center gap-3"><CalendarCheck className="size-5 text-rose-300" /> Real-time availability, instant confirmation</li>
          <li className="flex items-center gap-3"><Sparkles className="size-5 text-rose-300" /> Choose your favourite specialist</li>
          <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-rose-300" /> Reschedule or cancel online</li>
        </ul>
      </div>

      <div className="flex items-center justify-center px-4 pb-16 pt-28 sm:px-6 lg:pt-28">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="text-4xl">{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
          <p className="mt-2 text-muted">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <Link href={otherHref} className="font-semibold text-rose-600 hover:underline">
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </Link>
          </p>
          {next?.startsWith('/book') ? (
            <p className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              Your appointment selection is saved — you&apos;ll return to it right after.
            </p>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {mode === 'signup' ? (
              <Input label="Full name" name="name" autoComplete="name" placeholder="Jane Doe" error={errors.name} />
            ) : null}
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={errors.email}
            />
            {mode === 'signup' ? (
              <Input
                label="Phone (optional)"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 555 000 0000"
                hint="For appointment reminders only."
                error={errors.phone}
              />
            ) : null}
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              error={errors.password}
            />
            {formError ? (
              <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
                {formError}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
