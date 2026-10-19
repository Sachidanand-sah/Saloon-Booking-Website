import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import { getPublic } from '@/lib/server/api';
import type { SalonInfo } from '@/lib/types';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const salon = await getPublic<SalonInfo>('/salon', 300);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter hours={salon?.openingHours ?? null} />
    </div>
  );
}
