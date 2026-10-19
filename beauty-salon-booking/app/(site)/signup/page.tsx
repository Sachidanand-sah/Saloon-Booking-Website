import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/site/auth-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
