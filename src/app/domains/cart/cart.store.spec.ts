import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart.store';

describe('CartStore', () => {
  beforeEach(() => {
    localStorage.removeItem('kapomatic-cart');
    TestBed.resetTestingModule();
  });

  afterEach(() => localStorage.removeItem('kapomatic-cart'));

  it('adds a product, merges duplicate IDs, and persists a versioned snapshot', () => {
    const store = TestBed.inject(CartStore);
    const snapshot = {
      name: 'Transmission oil',
      imageUrl: 'https://images.test/oil.webp',
      unitPrice: 125,
      currency: 'EGP'
    };

    expect(store.add('product-1', snapshot)).toBeTrue();
    expect(store.add('product-1', snapshot)).toBeTrue();
    expect(store.lines().length).toBe(1);
    expect(store.count()).toBe(2);
    expect(JSON.parse(localStorage.getItem('kapomatic-cart') ?? '{}').version).toBe(1);
  });

  it('rejects invalid snapshots and never trusts a negative persisted price', () => {
    const store = TestBed.inject(CartStore);
    expect(
      store.add('product-1', {
        name: 'Invalid',
        imageUrl: '',
        unitPrice: -1,
        currency: 'EGP'
      })
    ).toBeFalse();
    expect(store.count()).toBe(0);
  });

  it('clears malformed persisted data during initialization', () => {
    localStorage.setItem('kapomatic-cart', '{broken');
    const store = TestBed.inject(CartStore);
    expect(store.lines()).toEqual([]);
    expect(localStorage.getItem('kapomatic-cart')).toBeNull();
  });
});
