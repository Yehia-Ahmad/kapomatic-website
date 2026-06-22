import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { EcommerceProduct } from './ecommerce.service';
import { GeneralSettingsService } from './general-settings.service';

export type CartItem = {
  id: string;
  categoryId?: string;
  title: string;
  subtitle?: string;
  price: number;
  currency: string;
  qty: number;
  imageSrc: string;
  specs: { label: string; value: string }[];
  inStock: boolean;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly generalSettings = inject(GeneralSettingsService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly storageKey = 'kapomatic-cart';
  private readonly itemsSignal = signal<CartItem[]>(this.readStoredItems());

  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.qty, 0));
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price * item.qty, 0));
  readonly currency = computed(
    () => this.generalSettings.settings().currencyCode || this.items()[0]?.currency || 'EGP'
  );

  constructor() {
    effect(() => {
      const items = this.itemsSignal();
      if (!this.isBrowser) return;
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    });
  }

  addProduct(product: EcommerceProduct, qty = 1) {
    const quantity = Math.max(1, Math.min(99, Math.trunc(qty)));
    this.itemsSignal.update((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(99, item.qty + quantity) } : item
        );
      }

      return [
        ...items,
        {
          id: product.id,
          categoryId: product.categoryId,
          title: product.title,
          subtitle: product.subTitle || product.brand,
          price: product.price || product.retailPrice,
          currency: product.currency || this.generalSettings.settings().currencyCode || 'EGP',
          qty: quantity,
          imageSrc: product.imageSrc,
          specs: product.specs.slice(0, 2),
          inStock: product.inStock
        }
      ];
    });
  }

  setQty(itemId: string, qty: number) {
    const quantity = Math.max(1, Math.min(99, Math.trunc(qty)));
    this.itemsSignal.update((items) =>
      items.map((item) => (item.id === itemId ? { ...item, qty: quantity } : item))
    );
  }

  increment(itemId: string) {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.id === itemId ? { ...item, qty: Math.min(99, item.qty + 1) } : item))
    );
  }

  decrement(itemId: string) {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.id === itemId ? { ...item, qty: Math.max(1, item.qty - 1) } : item))
    );
  }

  remove(itemId: string) {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== itemId));
  }

  clear() {
    this.itemsSignal.set([]);
  }

  private readStoredItems(): CartItem[] {
    if (!this.isBrowser) return [];

    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => this.isCartItem(item)) : [];
    } catch {
      return [];
    }
  }

  private isCartItem(item: unknown): item is CartItem {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record['id'] === 'string' &&
      typeof record['title'] === 'string' &&
      typeof record['price'] === 'number' &&
      typeof record['qty'] === 'number'
    );
  }
}
