import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../config/app-runtime-config';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ siteUrl: 'https://store.example' })
        }
      ]
    });
  });

  afterEach(() => {
    const document = TestBed.inject(DOCUMENT);
    document.head.querySelectorAll('[data-kapomatic-seo]').forEach((element) => element.remove());
    document.getElementById('kapomatic-structured-data')?.remove();
  });

  it('writes localized canonical, hreflang, social metadata and structured data', () => {
    const seo = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);
    const meta = TestBed.inject(Meta);
    const title = TestBed.inject(Title);

    seo.apply({
      title: 'English Home',
      description: 'Store description',
      path: '/en',
      locale: 'en',
      alternatePaths: { ar: '/ar', en: '/en', xDefault: '/ar' },
      structuredData: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Kapomatic' }]
    });

    expect(title.getTitle()).toBe('English Home');
    expect(meta.getTag("property='og:locale'")?.content).toBe('en_EG');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://store.example/en'
    );
    expect(document.querySelector<HTMLLinkElement>('link[hreflang="x-default"]')?.href).toBe(
      'https://store.example/ar'
    );
    expect(document.getElementById('kapomatic-structured-data')?.textContent).toContain('WebSite');
  });

  it('replaces generated links and JSON-LD instead of duplicating them', () => {
    const seo = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);
    const page = {
      title: 'Home',
      description: 'Description',
      path: '/ar',
      locale: 'ar' as const,
      alternatePaths: { ar: '/ar', en: '/en' }
    };

    seo.apply(page);
    seo.apply(page);

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveSize(1);
    expect(document.querySelectorAll('#kapomatic-structured-data')).toHaveSize(0);
  });
});
