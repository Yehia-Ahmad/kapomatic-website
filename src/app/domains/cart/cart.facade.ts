import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, filter, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { LocaleService } from '../../core/i18n/locale.service';
import { moneySum, moneyTotal, sameMoney } from '../../shared/pricing/normalized-price';
import { CatalogContractError, CatalogProduct } from '../catalog/catalog.models';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CartLine } from './cart.models';
import { CartStore } from './cart.store';

export type CartLineStatus =
  | 'valid'
  | 'price-changed'
  | 'out-of-stock'
  | 'removed'
  | 'temporarily-unavailable'
  | 'invalid';

interface CartValidation {
  readonly productId: string;
  readonly product: CatalogProduct | null;
  readonly status: CartLineStatus;
}

export interface CartViewLine extends CartLine {
  readonly product: CatalogProduct | null;
  readonly status: CartLineStatus;
  readonly productName: string;
  readonly imageUrl: string;
  readonly slug: string;
  readonly currentUnitPrice: number | null;
  readonly currentCurrency: string;
  readonly lineTotal: number | null;
  readonly purchasable: boolean;
  readonly maximumQuantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartFacade {
  readonly store = inject(CartStore);
  private readonly repository = inject(CatalogRepository);
  private readonly locale = inject(LocaleService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly validationSignal = signal<ReadonlyMap<string, CartValidation>>(new Map());
  private readonly revalidatingSignal = signal(false);
  private readonly retrySignal = signal(0);
  private readonly updatingIdsSignal = signal<ReadonlySet<string>>(new Set());
  private readonly trigger = computed(() => {
    if (!this.isBrowser || !this.store.restored()) return '';
    const ids = this.store
      .lines()
      .map((line) => line.productId)
      .sort()
      .join('|');
    return `${this.locale.locale()}:${ids}:${this.retrySignal()}`;
  });

  readonly revalidating = this.revalidatingSignal.asReadonly();
  readonly updatingIds = this.updatingIdsSignal.asReadonly();
  readonly lines = computed<readonly CartViewLine[]>(() => {
    const validation = this.validationSignal();
    return this.store.lines().map((line) => toViewLine(line, validation.get(line.productId)));
  });
  readonly subtotal = computed(() => {
    const purchasable = this.lines().filter(
      (line): line is CartViewLine & { currentUnitPrice: number } =>
        line.purchasable && line.currentUnitPrice !== null
    );
    const currencies = new Set(purchasable.map((line) => line.currentCurrency));
    if (purchasable.length === 0 || currencies.size !== 1) return null;
    return {
      amount: moneySum(purchasable.map((line) => moneyTotal(line.currentUnitPrice, line.quantity))),
      currency: purchasable[0]?.currentCurrency ?? 'EGP'
    };
  });
  readonly hasInvalidLines = computed(() => this.lines().some((line) => !line.purchasable));
  readonly hasPartialFailure = computed(() =>
    this.lines().some((line) => line.status === 'temporarily-unavailable')
  );
  readonly canRequestCheckout = computed(
    () =>
      this.store.restored() &&
      !this.revalidating() &&
      this.lines().length > 0 &&
      !this.hasInvalidLines() &&
      this.subtotal() !== null
  );

  constructor() {
    toObservable(this.trigger)
      .pipe(
        filter(Boolean),
        tap(() => this.revalidatingSignal.set(true)),
        switchMap(() => this.revalidate()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((validations) => {
        this.validationSignal.set(new Map(validations.map((item) => [item.productId, item])));
        this.revalidatingSignal.set(false);
      });
  }

  retry(): void {
    this.retrySignal.update((value) => value + 1);
  }

  increment(line: CartViewLine): void {
    this.update(line.productId, () =>
      this.store.increment(line.productId, line.product?.availableQuantity ?? null)
    );
  }

  decrement(line: CartViewLine): void {
    this.update(line.productId, () => this.store.decrement(line.productId));
  }

  remove(productId: string): void {
    this.update(productId, () => this.store.remove(productId));
  }

  private update(productId: string, mutation: () => boolean): void {
    this.updatingIdsSignal.update((ids) => new Set(ids).add(productId));
    mutation();
    queueMicrotask(() => {
      this.updatingIdsSignal.update((ids) => {
        const next = new Set(ids);
        next.delete(productId);
        return next;
      });
    });
  }

  private revalidate(): Observable<readonly CartValidation[]> {
    const lines = this.store.lines();
    if (lines.length === 0) return of([]);
    const locale = this.locale.locale();
    return forkJoin(
      lines.map((line) =>
        this.repository.loadProduct(locale, line.productId, { transfer: false, force: true }).pipe(
          map((product) => validationFor(line, product)),
          catchError((error: unknown) => of(validationFromError(line.productId, error)))
        )
      )
    );
  }
}

function validationFor(line: CartLine, product: CatalogProduct): CartValidation {
  if (!product.price) return { productId: line.productId, product, status: 'invalid' };
  if (product.availability === 'out-of-stock') {
    return { productId: line.productId, product, status: 'out-of-stock' };
  }
  if (product.availability !== 'in-stock') {
    return { productId: line.productId, product, status: 'temporarily-unavailable' };
  }
  const priceChanged =
    line.snapshot.currency !== product.price.currency ||
    !sameMoney(line.snapshot.unitPrice, product.price.effective);
  return { productId: line.productId, product, status: priceChanged ? 'price-changed' : 'valid' };
}

function validationFromError(productId: string, error: unknown): CartValidation {
  if (error instanceof ApiError && error.status === 404) {
    return { productId, product: null, status: 'removed' };
  }
  if (error instanceof CatalogContractError) {
    return { productId, product: null, status: 'invalid' };
  }
  return { productId, product: null, status: 'temporarily-unavailable' };
}

function toViewLine(line: CartLine, validation: CartValidation | undefined): CartViewLine {
  const product = validation?.product ?? null;
  const status = validation?.status ?? 'temporarily-unavailable';
  const price = product?.price ?? null;
  const purchasable = (status === 'valid' || status === 'price-changed') && price !== null;
  const currentUnitPrice = price?.effective ?? null;
  return {
    ...line,
    product,
    status,
    productName: product?.name ?? line.snapshot.name,
    imageUrl: product?.images[0]?.url ?? line.snapshot.imageUrl,
    slug: product?.slug ?? line.snapshot.slug ?? '',
    currentUnitPrice,
    currentCurrency: price?.currency ?? line.snapshot.currency,
    lineTotal: purchasable && currentUnitPrice !== null ? moneyTotal(currentUnitPrice, line.quantity) : null,
    purchasable,
    maximumQuantity: Math.max(1, Math.min(99, product?.availableQuantity ?? 99))
  };
}
