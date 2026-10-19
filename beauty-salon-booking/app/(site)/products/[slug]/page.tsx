import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Quote, Store, Wallet } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/misc';
import { Photo } from '@/components/ui/photo';
import { AddToBagPanel } from '@/components/shop/add-to-bag';
import { ProductCard } from '@/components/shop/product-card';
import { getPublic } from '@/lib/server/api';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getPublic<Product>(`/products/${(await params).slug}`);
  if (!product) return { title: 'Product not found' };
  return {
    title: `${product.name} by ${product.brand}`,
    description: `${product.description} ${formatPrice(product.price, product.currency)}. Reserve online, collect at any branch.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getPublic<Product>(`/products/${slug}`), getPublic<Product[]>('/products')]);
  if (!product) notFound();
  const related = (all ?? []).filter(p => p.id !== product.id && p.category === product.category).slice(0, 3);

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-sand/70 to-ivory pb-14 pt-28 sm:pt-32">
        <div className="container-page">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-plum-900">
            <ArrowLeft className="size-4" /> All products
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="animate-fade-up self-start overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-soft">
              <Photo src={product.imageUrl} alt={product.name} kind="product" className="aspect-square w-full" />
            </div>
            <div className="min-w-0 animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="rose">{product.category}</Badge>
                {product.inStock ? <Badge tone="success">In stock</Badge> : <Badge>Out of stock</Badge>}
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-rose-600">{product.brand}</p>
              <h1 className="mt-2 text-4xl sm:text-5xl">{product.name}</h1>
              <p className="mt-4 font-display text-3xl font-semibold text-plum-900">
                {formatPrice(product.price, product.currency)}
              </p>
              <p className="mt-6 text-lg leading-relaxed text-ink/80">{product.description}</p>

              <div className="card mt-8 p-5 sm:p-6">
                <AddToBagPanel product={product} />
                <ul className="mt-5 grid gap-2 border-t border-line pt-5 text-sm text-muted sm:grid-cols-2">
                  <li className="flex items-center gap-2">
                    <Store className="size-4 text-rose-500" /> Collect at any branch
                  </li>
                  <li className="flex items-center gap-2">
                    <Wallet className="size-4 text-rose-500" /> Pay when you pick up
                  </li>
                </ul>
              </div>

              {product.howToUse ? (
                <div className="mt-8">
                  <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-plum-900">How to use</h2>
                  <p className="mt-3 leading-relaxed text-ink/80">{product.howToUse}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {product.recommendedBy.length ? (
        <section className="container-page py-16">
          <p className="eyebrow">Why our pros love it</p>
          <h2 className="mt-3 text-3xl">Recommended by</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {product.recommendedBy.map(r => (
              <figure key={r.id} className="card flex flex-col p-6 sm:p-7">
                <Quote className="size-6 text-rose-300" aria-hidden />
                <blockquote className="mt-3 flex-1 font-display text-lg leading-relaxed text-plum-900">{r.note}</blockquote>
                <figcaption className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  <Avatar name={r.name} src={r.avatarUrl} className="size-12 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-plum-900">{r.name}</span>
                    <span className="text-sm text-muted">{r.title}</span>
                  </span>
                  <Link href={`/book?staff=${r.id}`} className="text-sm font-semibold text-rose-600 hover:underline">
                    Book with {r.name.split(' ')[0]}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {product.services.length ? (
        <section className="container-page pb-16">
          <div className="rounded-[var(--radius-card)] bg-sand/60 p-6 sm:p-8">
            <h2 className="text-2xl">Pairs with</h2>
            <p className="mt-1 text-sm text-muted">Keep the results of these treatments going at home.</p>
            <ul className="mt-5 flex flex-wrap gap-3">
              {product.services.map(s => (
                <li key={s.id}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-medium text-plum-900 transition hover:border-rose-300 hover:shadow-soft"
                  >
                    {s.name}
                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-rose-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="container-page pb-20">
          <h2 className="text-3xl">More {product.category.toLowerCase()}</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
