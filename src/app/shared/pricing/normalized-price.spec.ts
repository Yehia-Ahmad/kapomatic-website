import { moneySum, moneyTotal, normalizePrice, sameMoney } from './normalized-price';

describe('normalized pricing', () => {
  it('uses finalVisiblePrice as the effective price and derives a truthful discount', () => {
    expect(
      normalizePrice({
        retailPrice: '100.00',
        finalVisiblePrice: 80,
        discountPercentage: 99,
        currency: 'egp'
      })
    ).toEqual({
      original: 100,
      effective: 80,
      discountPercentage: 20,
      hasDiscount: true,
      currency: 'EGP'
    });
  });

  it('does not present a discount when the candidate is higher than the authoritative retail price', () => {
    expect(normalizePrice({ retailPrice: 100, priceAfterDiscount: 120, discountPercentage: 10 })).toEqual({
      original: 100,
      effective: 100,
      discountPercentage: 0,
      hasDiscount: false,
      currency: 'EGP'
    });
  });

  it('rejects missing or invalid money and falls back to a safe ISO currency', () => {
    expect(normalizePrice({ price: -1, finalVisiblePrice: 'not-money' })).toBeNull();
    expect(normalizePrice({ price: 15, currency: 'invalid' })?.currency).toBe('EGP');
  });

  it('calculates totals in minor units to avoid floating-point drift', () => {
    expect(moneyTotal(10.1, 3)).toBe(30.3);
    expect(moneySum([10.1, 20.2])).toBe(30.3);
    expect(sameMoney(10.1 + 20.2, 30.3)).toBeTrue();
  });
});
