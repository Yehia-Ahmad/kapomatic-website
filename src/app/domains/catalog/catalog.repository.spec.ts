import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { filterQueryKey } from './catalog.normalizer';
import { CatalogRepository } from './catalog.repository';

describe('CatalogRepository', () => {
  let repository: CatalogRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: '/api' })
        }
      ]
    });
    repository = TestBed.inject(CatalogRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serializes sort, pagination and the isolated scalar specification policy', async () => {
    const result = firstValueFrom(
      repository.loadCategoryProducts('en', 'filters', {
        page: 2,
        sort: 'price_desc',
        filters: { [filterQueryKey('Material')]: 'Metal' }
      })
    );
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/public/en/categories/filters/products' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '12' &&
        candidate.params.get('sort') === 'price_desc' &&
        candidate.params.get('Material') === 'Metal'
    );
    request.flush({
      data: {
        _id: 'category-1',
        name: 'Filters',
        slug: 'filters',
        products: [],
        pagination: { page: 2, limit: 12, totalItems: 13, totalPages: 2 }
      }
    });

    expect((await result).pagination.page).toBe(2);
  });

  it('uses the confirmed public Product endpoint with an explicit locale', async () => {
    const result = firstValueFrom(repository.loadProduct('ar', 'فلتر'));
    const request = http.expectOne('/api/public/ar/products/%D9%81%D9%84%D8%AA%D8%B1');
    request.flush({
      data: {
        _id: 'p1',
        name: 'فلتر',
        slug: 'فلتر',
        price: 10,
        imageUrl: 'https://kapomatic.com/api/public/images/products/p1'
      }
    });

    const product = await result;
    expect(product.id).toBe('p1');
    expect(product.images[0]?.url).toBe('/api/public/images/products/p1');
  });

  it('calls the public Search endpoint once with normalized query and pagination', async () => {
    const result = firstValueFrom(repository.searchProducts('en', '  transmission   filter ', 2));
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/public/products/search' &&
        candidate.params.get('q') === 'transmission filter' &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '12'
    );
    request.flush({
      success: true,
      products: [
        {
          id: 'p1',
          name: 'فلتر',
          slug: 'filter-ar',
          translations: { en: { name: 'Transmission filter', slug: 'transmission-filter' } },
          price: 100,
          currency: 'EGP'
        }
      ],
      pagination: {
        page: 2,
        limit: 12,
        totalItems: 13,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true
      }
    });

    expect((await result).products[0]?.name).toBe('Transmission filter');
    expect((await result).pagination).toEqual(jasmine.objectContaining({ page: 2, hasPreviousPage: true }));
  });
});
