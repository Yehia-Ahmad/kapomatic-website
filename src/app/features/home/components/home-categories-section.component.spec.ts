import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../../../core/config/app-runtime-config';
import { LocaleService } from '../../../core/i18n/locale.service';
import { HomeCategoriesStore } from '../../../domains/home/home-categories.store';
import { HomeCategoriesSectionComponent } from './home-categories-section.component';

@Component({ standalone: true, template: '' })
class EmptyRouteComponent {}

describe('HomeCategoriesSectionComponent', () => {
  let fixture: ComponentFixture<HomeCategoriesSectionComponent>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeCategoriesSectionComponent],
      providers: [
        provideRouter([{ path: 'en', component: EmptyRouteComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: '/api' })
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HomeCategoriesSectionComponent);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    TestBed.inject(LocaleService).initialize();
    TestBed.inject(HomeCategoriesStore).load('ar');
  });

  afterEach(() => http.verify());

  it('shows a skeleton, then renders real Category image, count and localized RouterLink', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.animate-pulse')).not.toBeNull();

    http.expectOne('/api/public/ar/categories/home?limit=12').flush({
      success: true,
      data: {
        categories: [
          {
            id: 'category-1',
            name: 'قطع ناقل الحركة',
            slug: 'قطع-ناقل-الحركة',
            localizedSlugs: {
              ar: 'قطع-ناقل-الحركة',
              en: 'transmission-parts'
            },
            image: {
              url: '/api/public/images/categories/category-1',
              alt: 'قطع ناقل الحركة'
            },
            productsCount: 24
          }
        ]
      }
    });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('app-home-category-card a') as HTMLAnchorElement;
    const image = card.querySelector('img') as HTMLImageElement;
    expect(card.getAttribute('href')).toBe(
      '/ar/categories/%D9%82%D8%B7%D8%B9-%D9%86%D8%A7%D9%82%D9%84-%D8%A7%D9%84%D8%AD%D8%B1%D9%83%D8%A9'
    );
    expect(card.textContent).toContain('قطع ناقل الحركة');
    expect(card.textContent).toContain('24 منتج');
    expect(image.getAttribute('src')).toBe('/api/public/images/categories/category-1');
    expect(image.getAttribute('alt')).toBe('قطع ناقل الحركة');
  });

  it('reloads the endpoint and localized data when the route language changes', async () => {
    fixture.detectChanges();
    http
      .expectOne('/api/public/ar/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();

    await fixture.ngZone?.run(() => router.navigateByUrl('/en'));
    TestBed.inject(HomeCategoriesStore).load('en');
    fixture.detectChanges();
    http
      .expectOne('/api/public/en/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No categories are available right now');
  });

  it('renders an authoritative empty state', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/public/ar/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('لا توجد أقسام متاحة حاليًا');
  });

  it('distinguishes a malformed response from empty data', () => {
    fixture.detectChanges();
    http.expectOne('/api/public/ar/categories/home?limit=12').flush({ success: true, data: {} });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('استجابة البيانات غير صالحة');
    expect(fixture.nativeElement.textContent).not.toContain('لا توجد أقسام متاحة حاليًا');
  });

  it('shows a network error and retries the Categories request', () => {
    fixture.detectChanges();
    http
      .expectOne('/api/public/ar/categories/home?limit=12')
      .flush({ message: 'Unavailable' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('تعذر تحميل الأقسام');
    const retry = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();
    http
      .expectOne('/api/public/ar/categories/home?limit=12')
      .flush({ success: true, data: { categories: [] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('لا توجد أقسام متاحة حاليًا');
  });

  it('uses the approved missing-image fallback after an image load failure', () => {
    fixture.detectChanges();
    http.expectOne('/api/public/ar/categories/home?limit=12').flush({
      success: true,
      data: {
        categories: [
          {
            id: 'category-1',
            name: 'زيوت',
            slug: 'زيوت',
            localizedSlugs: { ar: 'زيوت', en: 'oils' },
            image: { url: 'https://images.example.test/oils.webp', alt: 'زيوت' },
            productsCount: 2
          }
        ]
      }
    });
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('app-home-category-card img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-home-category-card img')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-home-category-card fa-icon')).not.toBeNull();
  });
});
