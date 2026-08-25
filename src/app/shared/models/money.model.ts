export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export interface PriceSnapshot {
  readonly original: Money;
  readonly effective: Money;
  readonly discountAmount: Money;
  readonly discountPercentage: number;
}

export function createMoney(amount: unknown, currency: unknown, fallbackCurrency = 'EGP'): Money {
  const parsed = Number(amount);
  return {
    amount: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    currency: normalizeCurrency(currency, fallbackCurrency)
  };
}

function normalizeCurrency(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value.trim().toUpperCase())
    ? value.trim().toUpperCase()
    : fallback;
}
