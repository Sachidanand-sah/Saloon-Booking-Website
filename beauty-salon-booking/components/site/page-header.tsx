import type { ReactNode } from 'react';

/** Soft intro band used at the top of inner pages (clears the fixed header). */
export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-sand/70 to-ivory pb-12 pt-32 sm:pb-16 sm:pt-36">
      <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-rose-100/60 blur-3xl" aria-hidden />
      <div className="container-page relative animate-fade-up">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
        {intro ? <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{intro}</p> : null}
        {children}
      </div>
    </section>
  );
}
