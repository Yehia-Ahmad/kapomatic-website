import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { HeaderStore } from './header.store';

describe('HeaderStore', () => {
  let store: HeaderStore;
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
    store = TestBed.inject(HeaderStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the localized public category index when the optional header contract is unavailable', () => {
    store.load('en');
    http.expectOne('/api/header').flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/public/seo/sitemap/categories?limit=100').flush({
      data: [
        {
          loc: 'https://kapomatic.com/en/categories/transmission-filters',
          image: {
            loc: 'https://kapomatic.com/api/public/images/categorys/category-1',
            title: 'Transmission Filters'
          }
        }
      ]
    });

    expect(store.status()).toBe('ready');
    expect(store.config().navigation[0]?.url).toBe('/en/categories/transmission-filters');
  });
});
