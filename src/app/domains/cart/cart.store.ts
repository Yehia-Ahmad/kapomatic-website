import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { safeImageSource } from '../../core/security/public-url.utils';
import { CartDisplaySnapshot, CartLine, PersistedCartV1 } from './cart.models';

const STORAGE_KEY = 'kapomatic-cart';
const MAX_LINES = 100;
const MAX_QUANTITY = 99;

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly linesSignal = signal<readonly CartLine[]>(this.read());
  private readonly announcementSignal = signal('');

  readonly lines = this.linesSignal.asReadonly();
  readonly announcement = this.announcementSignal.asReadonly();
  readonly count = computed(() => this.linesSignal().reduce((total, line) => total + line.quantity, 0));

  add(productId: string, snapshot: CartDisplaySnapshot): boolean {
    const id = productId.trim();
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    if (!id || !normalizedSnapshot) return false;
    const existing = this.linesSignal().find((line) => line.productId === id);
    const next = existing
      ? this.linesSignal().map((line) =>
          line.productId === id
            ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + 1), snapshot: normalizedSnapshot }
            : line
        )
      : this.linesSignal().length < MAX_LINES
        ? [...this.linesSignal(), { productId: id, quantity: 1, snapshot: normalizedSnapshot }]
        : this.linesSignal();
    if (next === this.linesSignal()) return false;
    this.linesSignal.set(next);
    this.persist(next);
    return true;
  }

  announce(message: string): void {
    this.announcementSignal.set('');
    queueMicrotask(() => this.announcementSignal.set(message));
  }

  private read(): readonly CartLine[] {
    if (!this.isBrowser || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      const value = asRecord(parsed);
      if (value['version'] !== 1 || !Array.isArray(value['lines'])) throw new Error('invalid cart');
      return value['lines']
        .slice(0, MAX_LINES)
        .map(normalizeLine)
        .filter((line): line is CartLine => line !== null);
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage is optional; a corrupt cache never blocks the storefront.
      }
      return [];
    }
  }

  private persist(lines: readonly CartLine[]): void {
    if (!this.isBrowser || typeof localStorage === 'undefined') return;
    const value: PersistedCartV1 = {
      version: 1,
      updatedAt: new Date().toISOString(),
      lines
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // The in-memory cart remains usable when persistence is unavailable.
    }
  }
}

function normalizeLine(source: unknown): CartLine | null {
  const value = asRecord(source);
  const productId = readString(value['productId']);
  const quantity = Number(value['quantity']);
  const snapshot = normalizeSnapshot(asRecord(value['snapshot']) as unknown as CartDisplaySnapshot);
  if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY || !snapshot) {
    return null;
  }
  return { productId, quantity, snapshot };
}

function normalizeSnapshot(source: CartDisplaySnapshot): CartDisplaySnapshot | null {
  const value = asRecord(source);
  const name = readString(value['name']).slice(0, 300);
  const unitPrice = Number(value['unitPrice']);
  const currency = readString(value['currency']).toUpperCase();
  if (!name || !Number.isFinite(unitPrice) || unitPrice < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return {
    name,
    imageUrl: safeImageSource(value['imageUrl']),
    unitPrice,
    currency
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
