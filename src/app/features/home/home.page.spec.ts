import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../core/config/app-runtime-config';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { CartStore } from '../../domains/cart/cart.store';
import { HomeStore } from '../../domains/home/home.store';
import { DEFAULT_STOREFRONT_SETTINGS } from '../../domains/settings/settings.models';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { HomePageComponent } from './home.page';

@Component({ standalone: true, template: '' })
class EmptyHomeRouteComponent {}

describe('HomePageComponent Home Categories integration', () => {
  let fixture: ComponentFixture<HomePageComponent>;
  let http: HttpTestingController;
  let router: Router;
  let homeLoad: jasmine.Spy;

  beforeEach(async () => {
    homeLoad = jasmine.createSpy('load');
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([{ path: 'en', component: EmptyHomeRouteComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: '/api' })
        },
        {
          provide: HomeStore,
          useValue: {
            load: homeLoad,
            retry: jasmine.createSpy('retry'),
            status: signal('ready').asReadonly(),
            sections: signal([]).asReadonly(),
            issues: signal([]).asReadonly(),
            hasPartialError: signal(false).asReadonly()
          }
        },
        {
          provide: StorefrontSettingsStore,
          useValue: {
            settings: signal(DEFAULT_STOREFRONT_SETTINGS).asReadonly(),
            status: signal('ready').asReadonly(),
            refresh: jasmine.createSpy('refresh')
          }
        },
        { provide: CartStore, useValue: { announcement: signal('').asReadonly() } },
        { provide: SeoService, useValue: { apply: jasmine.createSpy('apply') } }
      ]
    }).compileComponents();
    TestBed.inject(LocaleService).initialize();
    fixture = TestBed.createComponent(HomePageComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('loads exactly one localized Categories request on Arabic Home and again after switching to English', async () => {
    fixture.detectChanges();
    http
      .expectOne('/api/public/ar/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();

    expect(homeLoad).toHaveBeenCalledWith('ar');
    http.expectNone(
      (candidate) => candidate.url.includes('/categories/') && candidate.url.includes('/products')
    );

    await fixture.ngZone?.run(() => router.navigateByUrl('/en'));
    fixture.detectChanges();
    http
      .expectOne('/api/public/en/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();

    expect(homeLoad).toHaveBeenCalledWith('en');
  });
});
