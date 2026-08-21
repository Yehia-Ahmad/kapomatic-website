import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EcommerceService } from './ecommerce.service';

describe('EcommerceService public search', () => {
  let service: EcommerceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EcommerceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('uses the unified public search endpoint without a language segment', () => {
    service.searchPublicProducts('ar', 'filter', 1, 10).subscribe((result) => {
      expect(result.pagination.page).toBe(1);
      expect(result.products[0].title).toBe('فلتر زيت');
      expect(result.products[0].slug).toBe('فلتر-زيت');
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/products/search'));
    expect(request.request.url).not.toContain('/public/ar/products/search');
    expect(request.request.url).not.toContain('/public/en/products/search');
    expect(request.request.params.get('q')).toBe('filter');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush({
      success: true,
      products: [
        {
          id: 'product-1',
          name: 'Legacy name',
          translations: {
            ar: { name: 'فلتر زيت', slug: 'فلتر-زيت', shortDescription: 'وصف عربي' },
            en: { name: 'Oil Filter', slug: 'oil-filter', shortDescription: 'English summary' }
          },
          retailPrice: 100,
          currency: 'EGP'
        }
      ],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 }
    });
  });

  it('displays English search results with Arabic fallback when English fields are missing', () => {
    service.searchPublicProducts('en', 'فلتر', 1, 10).subscribe((result) => {
      expect(result.products[0].title).toBe('Arabic fallback');
      expect(result.products[0].slug).toBe('arabic-fallback');
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/products/search'));
    request.flush({
      success: true,
      products: [
        {
          id: 'product-1',
          name: 'Legacy name',
          translations: {
            ar: { name: 'Arabic fallback', slug: 'arabic-fallback' }
          },
          retailPrice: 100,
          currency: 'EGP'
        }
      ],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 }
    });
  });

  it('routes legacy active product search through the unified public endpoint', () => {
    service.searchActiveProducts('فور', 2, 5).subscribe((result) => {
      expect(result.pagination.page).toBe(2);
      expect(result.products.length).toBe(0);
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/api/public/products/search'));
    expect(request.request.url).not.toContain('/api/ecommerce-settings/products/search');
    expect(request.request.params.keys().sort()).toEqual(['limit', 'page', 'q']);
    expect(request.request.params.get('q')).toBe('فور');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('5');
    request.flush({
      success: true,
      products: [],
      pagination: { page: 2, limit: 5, totalItems: 0, totalPages: 1 }
    });
  });
});
