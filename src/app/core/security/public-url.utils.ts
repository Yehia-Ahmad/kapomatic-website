import { SupportedLocale } from '../http/api-endpoints';

export type PublicLink =
  | { readonly kind: 'internal'; readonly url: string }
  | { readonly kind: 'external'; readonly url: string };

export type ImageSourceNormalizer = (value: unknown) => string;

const IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;
const API_IMAGE_PATH = /^\/(?:api\/)?public\/images\/(categories|categorys|products)\/([^/?#]+)$/i;

export function safeImageSource(value: unknown): string {
  const source = readString(value);
  if (!source || /[\u0000-\u001f\u007f]/.test(source)) return '';
  if (source.startsWith('/') && !source.startsWith('//')) return source;
  if (/^https:\/\//i.test(source)) return source;
  if (isApprovedDevelopmentHttpUrl(source)) return source;
  return IMAGE_DATA_URL.test(source) ? source : '';
}

/**
 * Normalizes image values received from backend contracts. Public entity image
 * endpoints are deliberately rebuilt through the configured API base because
 * older responses can contain the storefront origin or the historic
 * `categorys` typo. Other absolute HTTPS/CDN URLs are kept unchanged.
 */
export function apiAwareImageSource(value: unknown, apiBaseUrl: string): string {
  const raw = readString(value);
  const relative = /^(?:api\/|public\/images\/)/i.test(raw) ? `/${raw}` : raw;
  const source = safeImageSource(relative) || approvedConfiguredHttpSource(relative, apiBaseUrl);
  if (!source || source.startsWith('data:')) return source;

  const parsed = parseUrl(source);
  const path = parsed?.pathname ?? source.split(/[?#]/, 1)[0] ?? '';
  const suffix = parsed ? `${parsed.search}${parsed.hash}` : source.slice(path.length);
  const publicImage = path.match(API_IMAGE_PATH);
  if (publicImage) {
    const collection = publicImage[1]?.toLowerCase() === 'products' ? 'products' : 'categories';
    return joinApiUrl(apiBaseUrl, `/public/images/${collection}/${publicImage[2]}${suffix}`);
  }

  if (!parsed && /^\/(?:api)(?:\/|$)/i.test(path)) {
    return joinApiUrl(apiBaseUrl, `${path.replace(/^\/api(?=\/|$)/i, '')}${suffix}`);
  }

  return source;
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
  if (/^\/(?:categories|products)\/[^/]+$/.test(normalized)) {
    return `/${locale}${normalized}${suffix}`;
  }
  if (['/cart', '/checkout', '/branches', '/locations', '/search'].includes(normalized)) {
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

function isApprovedDevelopmentHttpUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

function parseUrl(source: string): URL | null {
  if (!/^https?:\/\//i.test(source)) return null;
  try {
    return new URL(source);
  } catch {
    return null;
  }
}

function approvedConfiguredHttpSource(source: string, apiBaseUrl: string): string {
  try {
    const candidate = new URL(source);
    const configured = new URL(apiBaseUrl);
    return candidate.protocol === 'http:' && candidate.origin === configured.origin
      ? candidate.toString()
      : '';
  } catch {
    return '';
  }
}

function joinApiUrl(apiBaseUrl: string, path: string): string {
  const base = apiBaseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = `/${path.trim().replace(/^\/+/, '')}`;
  return `${base || '/api'}${normalizedPath}`;
}
