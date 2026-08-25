import {
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
    expect(safeImageSource('/api/image')).toBe('/api/image');
  });

  it('localizes known storefront paths while preserving query strings', () => {
    expect(localizedInternalUrl('/products?q=atf', 'en')).toBe('/en/search?q=atf');
    expect(localizedInternalUrl('/ar/cart?source=header', 'en')).toBe('/en/cart?source=header');
  });

  it('builds WhatsApp links only from plausible phone numbers or known hosts', () => {
    expect(whatsappLinkFromPhone('+20 100 000 0000')).toBe('https://wa.me/201000000000');
    expect(whatsappLinkFromPhone('123')).toBe('');
    expect(isWhatsappUrl('https://wa.me/201000000000')).toBeTrue();
    expect(isWhatsappUrl('https://example.test/whatsapp')).toBeFalse();
  });
});
