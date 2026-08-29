import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { HomeRepository } from './home.repository';

describe('HomeRepository', () => {
  let repository: HomeRepository;
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
    repository = TestBed.inject(HomeRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the public builder with explicit locale and a deterministic SSR device', async () => {
    const promise = firstValueFrom(repository.load('en'));
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/public/home-page' &&
        candidate.params.get('locale') === 'en' &&
        candidate.params.get('device') === 'desktop'
    );
    request.flush({ success: true, data: { sections: [] } });

    const content = await promise;
    expect(content.source).toBe('dynamic-builder');
    expect(content.sections).toEqual([]);
  });

  it('negotiates older confirmed endpoints only after an explicit unsupported response', async () => {
    const promise = firstValueFrom(repository.load('ar'));
    http
      .expectOne('/api/public/home-page?device=desktop&locale=ar')
      .flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/ecommerce-settings/home-page/categories').flush({
      categoryIds: [],
      categories: []
    });
    http.expectOne('/api/ecommerce-settings/categories/active').flush([]);
    http.expectOne('/api/public/seo/sitemap/categories?limit=100').flush({ data: [] });
    http.expectOne('/api/public/seo/sitemap/products?limit=100').flush({ data: [] });
    http.expectOne('/api/website-images/active-with-products').flush([]);

    const content = await promise;
    expect(content.source).toBe('legacy-confirmed');
    expect(content.capabilities.dynamicBuilder).toBeFalse();
    expect(content.issues).toEqual([]);
  });

  it('does not hide a normal server failure behind legacy fallback calls', async () => {
    const promise = firstValueFrom(repository.load('en'));
    http
      .expectOne('/api/public/home-page?device=desktop&locale=en')
      .flush({ code: 'FAILED' }, { status: 500, statusText: 'Server Error' });

    await expectAsync(promise).toBeRejected();
    http.expectNone('/api/ecommerce-settings/home-page/categories');
  });
});
