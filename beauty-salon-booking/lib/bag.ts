'use client';

import { useSyncExternalStore } from 'react';
import type { Product } from './types';

/** A product reservation "bag", kept in localStorage so it survives reloads. */
export type BagItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  quantity: number;
};

const KEY = 'lalima_bag_v1';
export const MAX_QTY = 10;
const EMPTY: BagItem[] = [];

let cache: BagItem[] | null = null;
const listeners = new Set<() => void>();

function isItem(x: unknown): x is BagItem {
  const i = x as BagItem;
  return !!i && typeof i.productId === 'string' && typeof i.name === 'string' && typeof i.price === 'number' && typeof i.quantity === 'number';
}

function read(): BagItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isItem) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(items: BagItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked (private mode): the bag still works for this page view.
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const bag = {
  add(p: Pick<Product, 'id' | 'slug' | 'name' | 'brand' | 'price' | 'currency' | 'imageUrl'>, quantity = 1) {
    const items = read();
    const existing = items.find(i => i.productId === p.id);
    write(
      existing
        ? items.map(i => (i.productId === p.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
        : [
            ...items,
            {
              productId: p.id,
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              price: p.price,
              currency: p.currency,
              imageUrl: p.imageUrl,
              quantity: Math.min(MAX_QTY, quantity),
            },
          ],
    );
  },
  setQuantity(productId: string, quantity: number) {
    if (quantity < 1) return bag.remove(productId);
    write(read().map(i => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)));
  },
  remove(productId: string) {
    write(read().filter(i => i.productId !== productId));
  },
  clear() {
    write(EMPTY);
  },
};

/** The bag's items; empty during server rendering and hydration. */
export function useBag() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const bagCount = (items: BagItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const bagTotal = (items: BagItem[]) => items.reduce((n, i) => n + i.price * i.quantity, 0);
