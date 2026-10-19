'use client';

import { Button } from '@/components/ui/button';

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center pt-24 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted">Please try again. If the problem continues, give us a call and we will be happy to help.</p>
      <Button className="mt-8" onClick={reset}>Try again</Button>
    </div>
  );
}
