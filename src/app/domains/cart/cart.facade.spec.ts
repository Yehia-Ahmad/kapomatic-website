import { computed, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { LocaleService } from '../../core/i18n/locale.service';
import { CatalogProduct } from '../catalog/catalog.models';
import { CatalogRepository } from '../catalog/catalog.repository';
import { CartLine } from './cart.models';
import { CartFacade } from './cart.facade';
import { CartStore } from './cart.store';

describe('CartFacade', () => {
  const lines = signal<readonly CartLine[]>([]);
  const restored = signal(true);
  const increment = jasmine.createSpy('increment');
  const decrement = jasmine.createSpy('decrement');
  const remove = jasmine.createSpy('remove');
  const loadProduct = jasmine.createSpy('loadProduct');
  const store = {
    lines,
    restored,
    count: computed(() => lines().reduce((total, line) => total + line.quantity, 0)),
    increment,
    decrement,
    remove
  };

  beforeEach(() => {
    lines.set([
      {
        productId: 'p1',
        quantity: 3,
        snapshot: {
          name: 'Saved product',
          imageUrl: '',
          unitPrice: 10.1,
          currency: 'EGP',
          slug: 'saved-product'
        }
      }
    ]);
    restored.set(true);
    increment.calls.reset();
    decrement.calls.reset();
    remove.calls.reset();
    loadProduct.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        CartFacade,
        { provide: CartStore, useValue: store },
        { provide: CatalogRepository, useValue: { loadProduct } },
        { provide: LocaleService, useValue: { locale: signal<'ar' | 'en'>('en') } }
      ]
    });
  });

  it('revalidates persisted lines, detects a changed price, and uses current minor-unit totals', fakeAsync(() => {
    loadProduct.and.returnValue(of(product({ effective: 12.25, original: 12.25 })));
    const facade = TestBed.inject(CartFacade);

    TestBed.flushEffects();
    tick();

    expect(facade.lines()[0]).toEqual(
      jasmine.objectContaining({
        status: 'price-changed',
        lineTotal: 36.75,
        purchasable: true,
        imageUrl: 'https://api.example/product-1.jpg',
        slug: 'current-product'
      })
    );
    expect(facade.subtotal()).toEqual({ amount: 36.75, currency: 'EGP' });
  }));

  it('keeps an unavailable persisted line visible and excludes it from checkout subtotal', fakeAsync(() => {
    loadProduct.and.returnValue(
      throwError(() => new ApiError('server', 503, 'UPSTREAM_UNAVAILABLE', true, ''))
    );
    const facade = TestBed.inject(CartFacade);

    TestBed.flushEffects();
    tick();

    expect(facade.lines()[0]?.status).toBe('temporarily-unavailable');
    expect(facade.lines()[0]?.productName).toBe('Saved product');
    expect(facade.subtotal()).toBeNull();
    expect(facade.canRequestCheckout()).toBeFalse();
  }));

  it('marks a confirmed 404 as removed without deleting browser data', fakeAsync(() => {
    loadProduct.and.returnValue(throwError(() => new ApiError('not-found', 404, 'NOT_FOUND', false, '')));
    const facade = TestBed.inject(CartFacade);

    TestBed.flushEffects();
    tick();

    expect(facade.lines()[0]?.status).toBe('removed');
    expect(lines()).toHaveSize(1);
    expect(remove).not.toHaveBeenCalled();
  }));
});

function product(price: { readonly original: number; readonly effective: number }): CatalogProduct {
  return {
    id: 'p1',
    locale: 'en',
    name: 'Current product',
    shortDescription: '',
    description: '',
    brand: '',
    code: '',
    slug: 'current-product',
    alternateSlugs: {},
    category: null,
    images: [{ id: 'image-1', url: 'https://api.example/product-1.jpg', alt: 'Current product' }],
    price: {
      ...price,
      currency: 'EGP',
      discountPercentage: 0,
      hasDiscount: false
    },
    availability: 'in-stock',
    availableQuantity: 8,
    specifications: [],
    rating: null,
    reviewCount: null,
    seo: {
      title: '',
      description: '',
      robots: 'index,follow',
      canonicalPath: '/en/products/current-product',
      alternatePaths: {}
    }
  };
}
