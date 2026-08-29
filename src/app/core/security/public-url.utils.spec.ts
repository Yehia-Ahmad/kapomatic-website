import {
  apiAwareImageSource,
  isWhatsappUrl,
  localizedInternalUrl,
  safeImageSource,
  safePublicLink,
  whatsappLinkFromPhone
} from './public-url.utils';

describe('public URL utilities', () => {
  it('accepts only local paths, HTTPS links, and supported image sources', () => {
    expect(safePublicLink('/products')).toEqual({ kind: 'internal', url: '/products' });
    expect(safePublicLink('https://example.test/path')?.kind).toBe('external');
    expect(safePublicLink('http://example.test')).toBeNull();
    expect(safePublicLink('javascript:alert(1)')).toBeNull();
    expect(safeImageSource('data:text/html;base64,AAAA')).toBe('');
    expect(safeImageSource('data:image/svg+xml;base64,PHN2Zz4=')).toBe('');
    expect(safeImageSource('http://localhost:5000/api/image')).toBe('http://localhost:5000/api/image');
    expect(safeImageSource('http://untrusted.example/image.jpg')).toBe('');
    expect(safeImageSource('/api/image')).toBe('/api/image');
  });

  it('routes confirmed public image endpoints through the configured API base without duplicating api', () => {
    expect(
      apiAwareImageSource(
        'https://kapomatic.com/api/public/images/products/product-1',
        'https://api.kapomatic.com/api'
      )
    ).toBe('https://api.kapomatic.com/api/public/images/products/product-1');
    expect(apiAwareImageSource('https://kapomatic.com/api/public/images/categorys/category-1', '/api')).toBe(
      '/api/public/images/categories/category-1'
    );
    expect(apiAwareImageSource('/api/website-images/slide-1/image', '/api')).toBe(
      '/api/website-images/slide-1/image'
    );
    expect(apiAwareImageSource('https://cdn.example/product.webp', '/api')).toBe(
      'https://cdn.example/product.webp'
    );
  });

  it('localizes known storefront paths while preserving query strings', () => {
    expect(localizedInternalUrl('/products?q=atf', 'en')).toBe('/en/search?q=atf');
    expect(localizedInternalUrl('/categories/transmission-filters', 'en')).toBe(
      '/en/categories/transmission-filters'
    );
    expect(localizedInternalUrl('/products/filter', 'ar')).toBe('/ar/products/filter');
    expect(localizedInternalUrl('/ar/cart?source=header', 'en')).toBe('/en/cart?source=header');
    expect(localizedInternalUrl('/branches', 'en')).toBe('/en/branches');
  });

  it('builds WhatsApp links only from plausible phone numbers or known hosts', () => {
    expect(whatsappLinkFromPhone('+20 100 000 0000')).toBe('https://wa.me/201000000000');
    expect(whatsappLinkFromPhone('123')).toBe('');
    expect(isWhatsappUrl('https://wa.me/201000000000')).toBeTrue();
    expect(isWhatsappUrl('https://example.test/whatsapp')).toBeFalse();
  });
});
