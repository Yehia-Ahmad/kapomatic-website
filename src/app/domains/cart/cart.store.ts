import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import { ImageSourceNormalizer } from '../../core/security/public-url.utils';
import {
  CartAddOptions,
  CartDisplaySnapshot,
  CartLine,
  CartRestorationState,
  CartStorageIssue,
  PersistedCartV2
} from './cart.models';

export const CART_STORAGE_KEY = 'kapomatic-cart';
export const CART_MAX_QUANTITY = 99;
const RECOVERY_STORAGE_KEY = 'kapomatic-cart-recovery';
const MAX_LINES = 100;

interface RestoredCart {
  readonly lines: readonly CartLine[];
  readonly issue: CartStorageIssue;
  readonly shouldMigrate: boolean;
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly urls = inject(ApiUrlBuilder);
  private readonly linesSignal = signal<readonly CartLine[]>([]);
  private readonly restorationSignal = signal<CartRestorationState>(
    this.isBrowser ? 'restoring' : 'server-shell'
  );
  private readonly storageIssueSignal = signal<CartStorageIssue>('none');
  private readonly announcementSignal = signal('');

  readonly lines = this.linesSignal.asReadonly();
  readonly restoration = this.restorationSignal.asReadonly();
  readonly restored = computed(() => this.restorationSignal() === 'restored');
  readonly storageIssue = this.storageIssueSignal.asReadonly();
  readonly announcement = this.announcementSignal.asReadonly();
  readonly count = computed(() => this.linesSignal().reduce((total, line) => total + line.quantity, 0));

  constructor() {
    if (this.isBrowser) afterNextRender(() => this.restore());
  }

  add(productId: string, snapshot: CartDisplaySnapshot, options: CartAddOptions): boolean {
    this.ensureRestored();
    const id = productId.trim();
    const normalizedSnapshot = normalizeSnapshot(snapshot, (source) => this.urls.image(source));
    if (!id || !normalizedSnapshot || options.availability !== 'in-stock') return false;
    const requested = clampQuantity(options.quantity ?? 1, options.maximumQuantity);
    const maximum = normalizedMaximum(options.maximumQuantity);
    const existing = this.linesSignal().find((line) => line.productId === id);
    if (existing && existing.quantity >= maximum) return false;
    const next = existing
      ? this.linesSignal().map((line) =>
          line.productId === id
            ? {
                ...line,
                quantity: Math.min(maximum, line.quantity + requested),
                snapshot: normalizedSnapshot
              }
            : line
        )
      : this.linesSignal().length < MAX_LINES
        ? [...this.linesSignal(), { productId: id, quantity: requested, snapshot: normalizedSnapshot }]
        : this.linesSignal();
    if (next === this.linesSignal()) return false;
    this.commit(next);
    return true;
  }

  setQuantity(productId: string, quantity: number, maximumQuantity?: number | null): boolean {
    this.ensureRestored();
    const nextQuantity = clampQuantity(quantity, maximumQuantity);
    let changed = false;
    const next = this.linesSignal().map((line) => {
      if (line.productId !== productId || line.quantity === nextQuantity) return line;
      changed = true;
      return { ...line, quantity: nextQuantity };
    });
    if (changed) this.commit(next);
    return changed;
  }

  increment(productId: string, maximumQuantity?: number | null): boolean {
    this.ensureRestored();
    const line = this.linesSignal().find((item) => item.productId === productId);
    return line ? this.setQuantity(productId, line.quantity + 1, maximumQuantity) : false;
  }

  decrement(productId: string): boolean {
    this.ensureRestored();
    const line = this.linesSignal().find((item) => item.productId === productId);
    return line ? this.setQuantity(productId, line.quantity - 1) : false;
  }

  remove(productId: string): boolean {
    this.ensureRestored();
    const next = this.linesSignal().filter((line) => line.productId !== productId);
    if (next.length === this.linesSignal().length) return false;
    this.commit(next);
    return true;
  }

  announce(message: string): void {
    this.announcementSignal.set('');
    queueMicrotask(() => this.announcementSignal.set(message));
  }

  restoreForTesting(): void {
    this.restore();
  }

  private ensureRestored(): void {
    if (this.isBrowser && this.restorationSignal() === 'restoring') this.restore();
  }

  private restore(): void {
    if (!this.isBrowser || this.restorationSignal() === 'restored') return;
    const restored = this.read();
    this.linesSignal.set(restored.lines);
    this.storageIssueSignal.set(restored.issue);
    this.restorationSignal.set('restored');
    if (restored.shouldMigrate) this.persist(restored.lines);
  }

  private read(): RestoredCart {
    if (typeof localStorage === 'undefined') {
      return { lines: [], issue: 'unavailable', shouldMigrate: false };
    }
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { lines: [], issue: 'none', shouldMigrate: false };
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return {
          lines: normalizeLegacyArray(parsed, (source) => this.urls.image(source)),
          issue: 'migrated',
          shouldMigrate: true
        };
      }
      const value = asRecord(parsed);
      if (!Array.isArray(value['lines']) || (value['version'] !== 1 && value['version'] !== 2)) {
        throw new Error('invalid cart');
      }
      const lines = normalizeLines(value['lines'], (source) => this.urls.image(source));
      return {
        lines,
        issue: value['version'] === 1 ? 'migrated' : 'none',
        shouldMigrate: value['version'] === 1
      };
    } catch {
      try {
        localStorage.setItem(RECOVERY_STORAGE_KEY, raw.slice(0, 250_000));
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        // The original value remains untouched if the recovery copy cannot be written.
      }
      return { lines: [], issue: 'corrupted', shouldMigrate: false };
    }
  }

  private commit(lines: readonly CartLine[]): void {
    this.linesSignal.set(lines);
    this.persist(lines);
  }

  private persist(lines: readonly CartLine[]): void {
    if (!this.isBrowser || typeof localStorage === 'undefined') return;
    const value: PersistedCartV2 = {
      version: 2,
      updatedAt: new Date().toISOString(),
      lines
    };
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value));
    } catch {
      this.storageIssueSignal.set('unavailable');
    }
  }
}

function normalizeLines(
  source: readonly unknown[],
  normalizeImage: ImageSourceNormalizer
): readonly CartLine[] {
  const combined = new Map<string, CartLine>();
  for (const item of source.slice(0, MAX_LINES)) {
    const line = normalizeLine(item, normalizeImage);
    if (!line) continue;
    const existing = combined.get(line.productId);
    combined.set(
      line.productId,
      existing
        ? {
            productId: line.productId,
            quantity: Math.min(CART_MAX_QUANTITY, existing.quantity + line.quantity),
            snapshot: line.snapshot
          }
        : line
    );
  }
  return [...combined.values()];
}

function normalizeLegacyArray(
  source: readonly unknown[],
  normalizeImage: ImageSourceNormalizer
): readonly CartLine[] {
  return normalizeLines(
    source.map((item) => {
      const value = asRecord(item);
      return {
        productId: value['id'] ?? value['productId'],
        quantity: value['qty'] ?? value['quantity'],
        snapshot: {
          name: value['title'] ?? value['name'],
          imageUrl: value['imageSrc'] ?? value['imageUrl'],
          unitPrice: value['price'] ?? value['unitPrice'],
          currency: value['currency'],
          slug: value['slug'] ?? value['productSlug'],
          alternateSlugs: value['alternateSlugs'],
          shortDescription: value['subtitle'] ?? value['shortDescription']
        }
      };
    }),
    normalizeImage
  );
}

function normalizeLine(source: unknown, normalizeImage: ImageSourceNormalizer): CartLine | null {
  const value = asRecord(source);
  const productId = readString(value['productId']);
  const quantity = finiteInteger(value['quantity']);
  const snapshot = normalizeSnapshot(value['snapshot'] as CartDisplaySnapshot, normalizeImage);
  if (!productId || quantity === null || !snapshot) return null;
  return { productId, quantity: clampQuantity(quantity), snapshot };
}

function normalizeSnapshot(
  source: CartDisplaySnapshot,
  normalizeImage: ImageSourceNormalizer
): CartDisplaySnapshot | null {
  const value = asRecord(source);
  const name = readString(value['name']).slice(0, 300);
  const unitPrice = Number(value['unitPrice']);
  const currency = readString(value['currency']).toUpperCase();
  if (!name || !Number.isFinite(unitPrice) || unitPrice < 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  const alternateSlugs = asRecord(value['alternateSlugs']);
  return {
    name,
    imageUrl: normalizeImage(value['imageUrl']),
    unitPrice,
    currency,
    slug: readString(value['slug']).slice(0, 300) || undefined,
    alternateSlugs: {
      ar: readString(alternateSlugs['ar']).slice(0, 300) || undefined,
      en: readString(alternateSlugs['en']).slice(0, 300) || undefined
    },
    shortDescription: readString(value['shortDescription']).slice(0, 500) || undefined
  };
}

function normalizedMaximum(maximumQuantity?: number | null): number {
  const maximum = finiteInteger(maximumQuantity);
  return maximum === null ? CART_MAX_QUANTITY : Math.max(1, Math.min(CART_MAX_QUANTITY, maximum));
}

function clampQuantity(quantity: number, maximumQuantity?: number | null): number {
  const value = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
  return Math.max(1, Math.min(normalizedMaximum(maximumQuantity), value));
}

function finiteInteger(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
