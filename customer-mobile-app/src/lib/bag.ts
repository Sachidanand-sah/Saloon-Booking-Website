import { useMemo, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/api/types';

/** A product line in the shopping bag (reserved online, paid at the branch). */
export type BagItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  quantity: number;
};

const KEY = 'lalima.bag.v1';
/** The API accepts up to 10 of one product per reservation. */
export const MAX_QTY = 10;

let items: BagItem[] = [];
let hydrated = false;
let touched = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(fn => fn());
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => undefined);
}

function set(next: BagItem[]) {
  touched = true;
  items = next;
  emit();
  persist();
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as BagItem[]) : [];
    if (!Array.isArray(saved) || !saved.length) return;
    if (touched) {
      // Something was added before storage finished loading: keep both.
      const merged = [...saved];
      for (const i of items) {
        const at = merged.findIndex(m => m.productId === i.productId);
        if (at >= 0) merged[at] = { ...merged[at], quantity: Math.min(MAX_QTY, merged[at].quantity + i.quantity) };
        else merged.push(i);
      }
      items = merged;
      persist();
    } else {
      items = saved.filter(i => i && typeof i.productId === 'string' && i.quantity > 0);
    }
    emit();
  } catch {
    // Corrupt or unavailable storage: start with an empty bag.
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  void hydrate();
  return () => {
    listeners.delete(fn);
  };
}

const getSnapshot = () => items;

export const bag = {
  add(product: Pick<Product, 'id' | 'slug' | 'name' | 'brand' | 'imageUrl' | 'price' | 'currency'>, quantity = 1) {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      set(items.map(i => (i.productId === product.id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i)));
    } else {
      set([
        ...items,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          price: product.price,
          currency: product.currency,
          quantity: Math.min(MAX_QTY, Math.max(1, quantity)),
        },
      ]);
    }
  },
  setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) return bag.remove(productId);
    set(items.map(i => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)));
  },
  remove(productId: string) {
    set(items.filter(i => i.productId !== productId));
  },
  clear() {
    set([]);
  },
};

/** The shopping bag, shared across screens and kept on the device. */
export function useBag() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      items: list,
      count: list.reduce((n, i) => n + i.quantity, 0),
      total: list.reduce((n, i) => n + i.price * i.quantity, 0),
      currency: list[0]?.currency ?? 'NPR',
      add: bag.add,
      setQuantity: bag.setQuantity,
      remove: bag.remove,
      clear: bag.clear,
    }),
    [list],
  );
}
