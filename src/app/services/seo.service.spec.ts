import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let document: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    document = TestBed.inject(DOCUMENT);
    document.head.querySelectorAll('meta, link[rel="canonical"], link[rel="alternate"], script[data-seo="true"]').forEach((element) => element.remove());
  });

  it('sets title, description, html language, and direction', () => {
    service.setPage({
      title: 'Arabic title',
      description: 'Arabic description',
      canonicalUrl: '/ar/products/sample',
      language: 'ar',
      direction: 'rtl'
    });

    expect(document.title).toBe('Arabic title');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Arabic description');
  });

  it('replaces canonical links instead of duplicating them', () => {
    service.setPage({
      title: 'First',
      description: 'First description',
      canonicalUrl: '/ar/products/first?utm_source=test',
      language: 'ar',
      direction: 'rtl'
    });
    service.setPage({
      title: 'Second',
      description: 'Second description',
      canonicalUrl: '/en/products/second',
      language: 'en',
      direction: 'ltr'
    });

    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicals.length).toBe(1);
    expect(canonicals[0].getAttribute('href')).toContain('/en/products/second');
  });

  it('replaces hreflang and JSON-LD groups', () => {
    service.setPage({
      title: 'First',
      description: 'First description',
      canonicalUrl: '/ar',
      language: 'ar',
      direction: 'rtl',
      alternateUrls: {
        ar: '/ar',
        en: '/en',
        xDefault: '/ar'
      },
      structuredData: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'First' }]
    });
    service.setPage({
      title: 'Second',
      description: 'Second description',
      canonicalUrl: '/en',
      language: 'en',
      direction: 'ltr',
      alternateUrls: {
        en: '/en'
      },
      structuredData: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Second' }]
    });

    expect(document.head.querySelectorAll('link[rel="alternate"][hreflang]').length).toBe(1);
    expect(document.head.querySelectorAll('script[type="application/ld+json"][data-seo="true"]').length).toBe(1);
    expect(document.head.querySelector('script[type="application/ld+json"][data-seo="true"]')?.textContent).toContain('Second');
  });

  it('does not emit aggregateRating when product rating data is missing', () => {
    const schema = service.productStructuredData(
      {
        id: 'p1',
        slug: 'sample-product',
        title: 'Sample Product',
        subTitle: '',
        brand: '',
        price: 0,
        retailPrice: 100,
        discountPercentage: null,
        priceAfterDiscount: null,
        hasDiscount: false,
        currency: 'EGP',
        rating: 0,
        reviewsCount: 0,
        imageSrc: '/image.jpg',
        images: [{ id: 'main', src: '/image.jpg', alt: 'Sample Product' }],
        inStock: false,
        shippingNote: '',
        specs: []
      },
      undefined,
      100,
      'https://kapomatic.com/en/products/sample-product'
    );

    expect(schema['aggregateRating']).toBeUndefined();
    expect((schema['offers'] as Record<string, unknown>)['priceCurrency']).toBe('EGP');
    expect((schema['offers'] as Record<string, unknown>)['availability']).toBe('https://schema.org/OutOfStock');
  });
});
