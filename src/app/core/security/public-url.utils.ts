import { SupportedLocale } from '../http/api-endpoints';

export type PublicLink =
  | { readonly kind: 'internal'; readonly url: string }
  | { readonly kind: 'external'; readonly url: string };

export function safeImageSource(value: unknown): string {
  const source = readString(value);
  if (!source || /[\u0000-\u001f\u007f]/.test(source)) return '';
  if (source.startsWith('/') && !source.startsWith('//')) return source;
  if (/^https:\/\//i.test(source)) return source;
  return /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(source) ? source : '';
}

export function safePublicLink(value: unknown): PublicLink | null {
  const source = readString(value);
  if (!source || /[\u0000-\u001f\u007f]/.test(source)) return null;
  if (source.startsWith('/') && !source.startsWith('//')) return { kind: 'internal', url: source };

  try {
    const url = new URL(source);
    return url.protocol === 'https:' ? { kind: 'external', url: url.toString() } : null;
  } catch {
    return null;
  }
}

export function localizedInternalUrl(value: string, locale: SupportedLocale): string {
  const [path, suffix = ''] = value.split(/(?=[?#])/, 2);
  const normalized = path?.replace(/\/+$/, '') || '/';
  if (/^\/(?:ar|en)(?:\/|$)/.test(normalized)) {
    return normalized.replace(/^\/(?:ar|en)(?=\/|$)/, `/${locale}`) + suffix;
  }
  if (normalized === '/' || normalized === '/home') return `/${locale}${suffix}`;
  if (normalized === '/products') return `/${locale}/search${suffix}`;
  if (normalized.startsWith('/products?')) return `/${locale}/search${normalized.slice(9)}${suffix}`;
  if (['/cart', '/checkout', '/locations', '/search'].includes(normalized)) {
    return `/${locale}${normalized}${suffix}`;
  }
  return `${normalized}${suffix}`;
}

export function whatsappLinkFromPhone(value: unknown): string {
  const digits = readString(value).replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15 ? `https://wa.me/${digits}` : '';
}

export function isWhatsappUrl(value: unknown): boolean {
  const link = safePublicLink(value);
  if (!link || link.kind !== 'external') return false;
  const host = new URL(link.url).hostname.toLowerCase();
  return host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com');
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
