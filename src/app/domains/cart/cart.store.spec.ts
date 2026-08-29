import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { CART_MAX_QUANTITY, CART_STORAGE_KEY, CartStore } from './cart.store';

describe('CartStore', () => {
  beforeEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem('kapomatic-cart-recovery');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: 'https://api.kapomatic.com/api' })
        }
      ]
    });
  });

  afterEach(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem('kapomatic-cart-recovery');
  });

  it('adds a product, merges duplicate IDs, and persists a versioned snapshot', () => {
    const store = TestBed.inject(CartStore);
    const snapshot = {
      name: 'Transmission oil',
      imageUrl: 'https://images.test/oil.webp',
      unitPrice: 125,
      currency: 'EGP'
    };

    expect(store.add('product-1', snapshot, { availability: 'in-stock' })).toBeTrue();
    expect(store.add('product-1', snapshot, { availability: 'in-stock' })).toBeTrue();
    expect(store.lines().length).toBe(1);
    expect(store.count()).toBe(2);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}').version).toBe(2);
  });

  it('rejects invalid snapshots and never trusts a negative persisted price', () => {
    const store = TestBed.inject(CartStore);
    expect(
      store.add(
        'product-1',
        {
          name: 'Invalid',
          imageUrl: '',
          unitPrice: -1,
          currency: 'EGP'
        },
        { availability: 'in-stock' }
      )
    ).toBeFalse();
    expect(store.count()).toBe(0);
  });

  it('backs up malformed persisted data and reports recovery after restoration', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{broken');
    const store = TestBed.inject(CartStore);
    store.restoreForTesting();
    expect(store.lines()).toEqual([]);
    expect(store.storageIssue()).toBe('corrupted');
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('kapomatic-cart-recovery')).toBe('{broken');
  });

  it('migrates version 1, combines duplicate IDs, and clamps invalid quantities', () => {
    const snapshot = {
      name: 'Saved product',
      imageUrl: '',
      unitPrice: 125.5,
      currency: 'EGP'
    };
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: '2026-01-01T00:00:00.000Z',
        lines: [
          { productId: 'saved-1', quantity: -5, snapshot },
          { productId: 'saved-1', quantity: 500, snapshot }
        ]
      })
    );

    const store = TestBed.inject(CartStore);
    store.restoreForTesting();

    expect(store.lines()).toEqual([
      jasmine.objectContaining({ productId: 'saved-1', quantity: CART_MAX_QUANTITY })
    ]);
    expect(store.storageIssue()).toBe('migrated');
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}').version).toBe(2);
  });

  it('repairs persisted public image origins and retains legacy product navigation fields', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'product-1',
          title: 'Saved product',
          imageUrl: 'https://kapomatic.com/api/public/images/products/product-1',
          price: 125,
          currency: 'EGP',
          slug: 'saved-product',
          quantity: 1
        }
      ])
    );

    const store = TestBed.inject(CartStore);
    store.restoreForTesting();

    expect(store.lines()[0]?.snapshot).toEqual(
      jasmine.objectContaining({
        imageUrl: 'https://api.kapomatic.com/api/public/images/products/product-1',
        slug: 'saved-product'
      })
    );
  });

  it('rejects service-layer additions that are not confirmed in stock', () => {
    const store = TestBed.inject(CartStore);
    const snapshot = { name: 'Unavailable', imageUrl: '', unitPrice: 12, currency: 'EGP' };

    expect(store.add('product-1', snapshot, { availability: 'out-of-stock' })).toBeFalse();
    expect(store.add('product-1', snapshot, { availability: 'unknown' })).toBeFalse();
    expect(store.lines()).toEqual([]);
  });

  it('keeps an SSR-only shell without reading browser storage', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: '/api' })
        }
      ]
    });
    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const store = TestBed.inject(CartStore);

    store.restoreForTesting();

    expect(store.restoration()).toBe('server-shell');
    expect(store.lines()).toEqual([]);
    expect(getItem).not.toHaveBeenCalled();
  });
});
