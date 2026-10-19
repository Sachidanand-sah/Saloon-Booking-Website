'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { bag, MAX_QTY, useBag } from '@/lib/bag';
import { cn } from '@/lib/format';
import type { Product } from '@/lib/types';

type BagProduct = Pick<Product, 'id' | 'slug' | 'name' | 'brand' | 'price' | 'currency' | 'imageUrl' | 'inStock'>;

/** Compact "Add to bag" for product cards. */
export function AddToBagButton({ product, className }: { product: BagProduct; className?: string }) {
  const items = useBag();
  const toast = useToast();
  const inBag = items.find(i => i.productId === product.id);

  if (!product.inStock) {
    return (
      <Button size="sm" variant="outline" disabled className={className}>
        Out of stock
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant={inBag ? 'outline' : 'primary'}
      className={className}
      onClick={() => {
        bag.add(product);
        toast(`${product.name} added to your bag.`);
      }}
      aria-label={`Add ${product.name} to bag`}
    >
      {inBag ? <Check className="size-4" /> : <ShoppingBag className="size-4" />}
      {inBag ? `In bag (${inBag.quantity})` : 'Add to bag'}
    </Button>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex h-11 items-center rounded-full border border-line bg-white', className)} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="flex size-11 items-center justify-center rounded-full text-plum-900 hover:bg-plum-50 disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums text-plum-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY}
        className="flex size-11 items-center justify-center rounded-full text-plum-900 hover:bg-plum-50 disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/** Quantity picker + add button for the product page. */
export function AddToBagPanel({ product }: { product: BagProduct }) {
  const [qty, setQty] = useState(1);
  const items = useBag();
  const toast = useToast();
  const inBag = items.find(i => i.productId === product.id);

  if (!product.inStock) {
    return (
      <p className="rounded-xl bg-sand/70 px-4 py-3 text-sm text-muted">
        Currently out of stock. Ask at any branch and we&apos;ll let you know when it&apos;s back.
      </p>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={n => setQty(Math.max(1, Math.min(MAX_QTY, n)))} label="Quantity" />
        <Button
          size="lg"
          className="flex-1"
          onClick={() => {
            bag.add(product, qty);
            toast(`${qty} × ${product.name} added to your bag.`);
            setQty(1);
          }}
        >
          <ShoppingBag className="size-4" /> Add to bag
        </Button>
      </div>
      {inBag ? (
        <p className="mt-3 text-sm text-muted">
          {inBag.quantity} in your bag ·{' '}
          <Link href="/bag" className="font-semibold text-rose-600 hover:underline">
            View bag
          </Link>
        </p>
      ) : null}
    </div>
  );
}
