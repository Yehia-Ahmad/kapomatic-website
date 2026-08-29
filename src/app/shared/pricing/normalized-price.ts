export interface NormalizedPrice {
  readonly currency: string;
  readonly original: number;
  readonly effective: number;
  readonly discountPercentage: number;
  readonly hasDiscount: boolean;
}

export interface PriceCandidates {
  readonly currency?: unknown;
  readonly retailPrice?: unknown;
  readonly price?: unknown;
  readonly finalVisiblePrice?: unknown;
  readonly priceAfterDiscount?: unknown;
  readonly salePrice?: unknown;
  readonly discountPercentage?: unknown;
}

export function normalizePrice(source: PriceCandidates, fallbackCurrency = 'EGP'): NormalizedPrice | null {
  const retail = finiteNonNegative(source.retailPrice);
  const generic = finiteNonNegative(source.price);
  const original = retail ?? generic;
  const candidate = firstFiniteNonNegative(
    source.finalVisiblePrice,
    source.priceAfterDiscount,
    source.salePrice,
    source.price
  );

  if (original === null && candidate === null) return null;
  const safeOriginal = roundMoney(original ?? candidate ?? 0);
  const possibleEffective = roundMoney(candidate ?? safeOriginal);
  const effective = possibleEffective <= safeOriginal ? possibleEffective : safeOriginal;
  const suppliedDiscount = finiteNonNegative(source.discountPercentage);
  const derivedDiscount =
    safeOriginal > 0 && effective < safeOriginal
      ? Math.round(((safeOriginal - effective) / safeOriginal) * 100)
      : 0;
  const validSupplied =
    suppliedDiscount !== null && suppliedDiscount > 0 && suppliedDiscount < 100
      ? Math.round(suppliedDiscount)
      : 0;
  const hasDiscount = effective < safeOriginal && (derivedDiscount > 0 || validSupplied > 0);

  return {
    currency: normalizeCurrency(source.currency, fallbackCurrency),
    original: safeOriginal,
    effective,
    discountPercentage: hasDiscount ? derivedDiscount || validSupplied : 0,
    hasDiscount
  };
}

export function formatMoney(amount: number, currency: string, locale: 'ar' | 'en'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function moneyTotal(unitPrice: number, quantity: number): number {
  return fromMinorUnits(toMinorUnits(unitPrice) * Math.max(0, Math.trunc(quantity)));
}

export function moneySum(amounts: readonly number[]): number {
  return fromMinorUnits(amounts.reduce((total, amount) => total + toMinorUnits(amount), 0));
}

export function sameMoney(left: number, right: number): boolean {
  return toMinorUnits(left) === toMinorUnits(right);
}

function firstFiniteNonNegative(...values: readonly unknown[]): number | null {
  for (const value of values) {
    const normalized = finiteNonNegative(value);
    if (normalized !== null) return normalized;
  }
  return null;
}

function finiteNonNegative(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeCurrency(value: unknown, fallback: string): string {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  const safeFallback = /^[A-Z]{3}$/.test(fallback.toUpperCase()) ? fallback.toUpperCase() : 'EGP';
  return /^[A-Z]{3}$/.test(candidate) ? candidate : safeFallback;
}

function roundMoney(value: number): number {
  return fromMinorUnits(toMinorUnits(value));
}

function toMinorUnits(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100);
}

function fromMinorUnits(value: number): number {
  return value / 100;
}
