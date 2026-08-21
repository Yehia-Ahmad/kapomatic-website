import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export type LanguageCode = 'ar' | 'en';
export type TextDirection = 'rtl' | 'ltr';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'msclkid'
]);

@Injectable({ providedIn: 'root' })
export class UrlService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  apiUrl(path: string): string {
    return this.joinUrl(environment.api_base_url, path);
  }

  apiConfigured(): boolean {
    return Boolean(environment.api_base_url && !environment.api_base_url.includes('{{'));
  }

  apiOrigin(): string {
    if (!this.apiConfigured()) return '';
    try {
      return new URL(environment.api_base_url).origin;
    } catch {
      return '';
    }
  }

  siteOrigin(): string {
    const configured = this.trimTrailingSlash(environment.site_url);
    if (configured && !configured.includes('{{')) return configured;
    if (isPlatformBrowser(this.platformId)) return this.document.location.origin;
    return configured || '';
  }

  absoluteUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return this.siteOrigin();
    if (/^(https?:|data:)/i.test(pathOrUrl)) return pathOrUrl;
    return this.joinUrl(this.siteOrigin(), pathOrUrl);
  }

  publicImageUrl(pathOrUrl: string): string {
    if (!pathOrUrl || /^data:/i.test(pathOrUrl)) return this.absoluteUrl('/favicon.ico');
    return this.absoluteUrl(pathOrUrl);
  }

  canonicalUrl(pathOrUrl: string): string {
    const absolute = this.absoluteUrl(pathOrUrl);
    try {
      const url = new URL(absolute);
      for (const key of Array.from(url.searchParams.keys())) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
      }
      url.hash = '';
      return url.toString();
    } catch {
      return absolute.split('#')[0];
    }
  }

  localizedHome(language: LanguageCode): string {
    return `/${language}`;
  }

  localizedCategory(language: LanguageCode, slug: string): string {
    return `/${language}/categories/${encodeURIComponent(slug)}`;
  }

  localizedProduct(language: LanguageCode, slug: string): string {
    return `/${language}/products/${encodeURIComponent(slug)}`;
  }

  localizedSearch(language: LanguageCode): string {
    return `/${language}/search`;
  }

  localizedCart(language: LanguageCode): string {
    return `/${language}/cart`;
  }

  localizedCheckout(language: LanguageCode): string {
    return `/${language}/checkout`;
  }

  localizedLocations(language: LanguageCode): string {
    return `/${language}/locations`;
  }

  direction(language: LanguageCode): TextDirection {
    return language === 'ar' ? 'rtl' : 'ltr';
  }

  normalizeLanguage(value: string | null | undefined): LanguageCode {
    return value === 'en' ? 'en' : 'ar';
  }

  private joinUrl(base: string, path: string): string {
    const normalizedBase = this.trimTrailingSlash(base || '');
    const normalizedPath = path.replace(/^\/+/, '');
    if (!normalizedBase) return `/${normalizedPath}`;
    return `${normalizedBase}/${normalizedPath}`;
  }

  private trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
  }
}
