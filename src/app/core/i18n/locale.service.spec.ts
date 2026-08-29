import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LocaleService } from './locale.service';

@Component({ standalone: true, template: '' })
class RouteStubComponent {}

describe('LocaleService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: ':lang', component: RouteStubComponent },
          { path: ':lang/search', component: RouteStubComponent },
          { path: ':lang/categories/:slug', component: RouteStubComponent },
          { path: ':lang/products/:slug', component: RouteStubComponent },
          { path: ':lang/cart', component: RouteStubComponent }
        ])
      ]
    });
  });

  it('updates document language and direction from localized navigation', async () => {
    const locale = TestBed.inject(LocaleService);
    const router = TestBed.inject(Router);
    const document = TestBed.inject(DOCUMENT);

    await router.navigateByUrl('/en');
    expect(locale.locale()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    await router.navigateByUrl('/ar');
    expect(locale.locale()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('preserves query and fragment while switching the Home search locale', async () => {
    const locale = TestBed.inject(LocaleService);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ar/search?q=oil#results');

    expect(await locale.switchLocale('en')).toBeTrue();
    expect(router.url).toBe('/en/search?q=oil#results');
  });

  it('uses an authoritative alternate Category slug and preserves safe query parameters', async () => {
    const locale = TestBed.inject(LocaleService);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ar/categories/فلاتر-فتيس?sort=price_asc');
    locale.setAlternateSlugs({ ar: 'فلاتر-فتيس', en: 'transmission-filters' });

    expect(await locale.switchLocale('en')).toBeTrue();
    expect(router.url).toBe('/en/categories/transmission-filters?sort=price_asc');
  });

  it('does not translate an entity slug manually when no alternate is available', async () => {
    const locale = TestBed.inject(LocaleService);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ar/products/منتج-بدون-بديل');

    expect(await locale.switchLocale('en')).toBeTrue();
    expect(router.url).toBe('/en');
  });

  it('changes only the locale segment for Cart', async () => {
    const locale = TestBed.inject(LocaleService);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ar/cart?source=header');

    expect(await locale.switchLocale('en')).toBeTrue();
    expect(router.url).toBe('/en/cart?source=header');
  });
});
