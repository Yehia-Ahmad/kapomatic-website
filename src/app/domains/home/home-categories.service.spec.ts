import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { HomeCategory } from './home.models';
import { HOME_CATEGORIES_LIMIT, HomeCategoriesService } from './home-categories.service';

describe('HomeCategoriesService', () => {
  let service: HomeCategoriesService;
  let http: HttpTestingController;
  let transferState: TransferState;

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
    service = TestBed.inject(HomeCategoriesService);
    http = TestBed.inject(HttpTestingController);
    transferState = TestBed.inject(TransferState);
  });

  afterEach(() => http.verify());

  it('requests the Arabic endpoint once with limit 12 and no duplicated /api', async () => {
    const promise = firstValueFrom(service.load('ar'));
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/public/ar/categories/home' &&
        candidate.params.get('limit') === String(HOME_CATEGORIES_LIMIT)
    );
    expect(request.request.urlWithParams).toBe('/api/public/ar/categories/home?limit=12');
    expect(request.request.urlWithParams).not.toContain('/api/api/');
    request.flush({ success: true, data: { categories: [] } });

    await expectAsync(promise).toBeResolvedTo([]);
    http.expectNone((candidate) => candidate.url.includes('/products'));
  });

  it('requests the English endpoint and normalizes its active slug and image', async () => {
    const promise = firstValueFrom(service.load('en'));
    const request = http.expectOne('/api/public/en/categories/home?limit=12');
    request.flush({
      success: true,
      data: {
        categories: [
          {
            id: 'category-1',
            name: 'Transmission Parts',
            slug: 'transmission-parts',
            localizedSlugs: { ar: 'قطع-ناقل-الحركة', en: 'transmission-parts' },
            image: {
              url: '/api/public/images/categories/category-1',
              alt: 'Transmission Parts'
            },
            productsCount: 1
          }
        ]
      }
    });

    const [category] = await promise;
    expect(category).toEqual(
      jasmine.objectContaining({
        name: 'Transmission Parts',
        activeSlug: 'transmission-parts',
        imageUrl: '/api/public/images/categories/category-1',
        productsCount: 1
      })
    );
  });

  it('consumes successful SSR TransferState without a hydration request', async () => {
    const transferred: readonly HomeCategory[] = [
      {
        id: 'category-1',
        name: 'Transmission Parts',
        activeSlug: 'transmission-parts',
        localizedSlugs: { ar: 'قطع-ناقل-الحركة', en: 'transmission-parts' },
        imageUrl: null,
        imageAlt: 'Transmission Parts',
        productsCount: 3
      }
    ];
    const key = makeStateKey<readonly HomeCategory[]>('kapomatic-home-categories-v1-en');
    transferState.set(key, transferred);

    await expectAsync(firstValueFrom(service.load('en'))).toBeResolvedTo(transferred);
    await expectAsync(firstValueFrom(service.load('en'))).toBeResolvedTo(transferred);
    http.expectNone('/api/public/en/categories/home?limit=12');
    expect(transferState.hasKey(key)).toBeFalse();
  });
});
