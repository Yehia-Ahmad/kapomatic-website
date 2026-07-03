import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { EcommerceProduct } from './ecommerce.service';
import { GeneralSettings } from './general-settings.service';

type SeoConfig = {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  image?: string;
  type?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

const SITE_NAME = 'Kapomatic';
const DEFAULT_TITLE = 'Kapomatic | Car Spare Parts, Gearbox Parts & Oils in Egypt';
const DEFAULT_DESCRIPTION =
  'Buy car spare parts, gearbox parts, transmission components, engine oils, and automatic gearbox oils from Kapomatic. Find reliable automotive products in Egypt.';
const HOME_TITLE = 'Kapomatic | Gearbox Parts, Car Spare Parts & Oils';
const HOME_DESCRIPTION =
  'Kapomatic provides car spare parts, gearbox parts, transmission spare parts, engine oils, and automatic transmission oils for customers looking for reliable automotive products in Egypt.';
const DEFAULT_KEYWORDS = [
  'car spare parts Egypt',
  'gearbox spare parts',
  'transmission parts',
  'automatic transmission oil',
  'engine oil',
  'car oils',
  'Kapomatic',
  'automotive spare parts',
  'قطع غيار سيارات',
  'قطع غيار فتيس',
  'زيوت سيارات',
  'زيت فتيس اوتوماتيك',
  'زيت موتور',
  'كابوماتيك',
  'قطع غيار سيارات مصر'
];
const DEFAULT_IMAGE = '/favicon.ico';
// TODO: Replace the fallback with environment.site_url when the production storefront domain is configured.
const FALLBACK_SITE_URL = 'https://kapomatic.com';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  setHomePage(settings?: GeneralSettings) {
    this.update({
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      path: '/',
      structuredData: this.globalStructuredData(settings)
    });
  }

  setProductsPage(options: { categoryName?: string; categoryId?: string; searchQuery?: string; targetedTitle?: string }) {
    const categoryName = options.categoryName?.trim();
    const searchQuery = options.searchQuery?.trim();
    const targetedTitle = options.targetedTitle?.trim();
    const title = searchQuery
      ? `Search results for ${searchQuery} | Kapomatic`
      : categoryName
        ? `${categoryName} | Kapomatic`
        : targetedTitle
          ? `${targetedTitle} | Kapomatic`
          : 'Car Spare Parts, Gearbox Parts & Oils | Kapomatic';
    const description = searchQuery
      ? `Search Kapomatic for ${searchQuery}. Find car spare parts, gearbox parts, transmission components, engine oils, and car oils in Egypt.`
      : categoryName
        ? `Shop ${categoryName} at Kapomatic. Find reliable automotive spare parts, gearbox parts, transmission products, and car oils in Egypt.`
        : 'Shop car spare parts, gearbox parts, transmission components, engine oils, and automatic gearbox oils at Kapomatic in Egypt.';
    const params = new URLSearchParams();
    if (options.categoryId) params.set('categoryId', options.categoryId);
    if (searchQuery) params.set('search', searchQuery);

    this.update({
      title,
      description,
      path: `/products${params.toString() ? `?${params.toString()}` : ''}`
    });
  }

  setProductPage(product: EcommerceProduct, categoryName?: string) {
    const price = product.hasDiscount ? product.priceAfterDiscount : product.retailPrice || product.price;
    const description = `Buy ${product.title} from Kapomatic. Explore gearbox parts, car spare parts, transmission products, and car oils in Egypt.`;

    this.update({
      title: `${product.title} | Kapomatic`,
      description,
      path: `/products/${encodeURIComponent(product.id)}${product.categoryId ? `?categoryId=${encodeURIComponent(product.categoryId)}` : ''}`,
      image: product.imageSrc,
      type: 'product',
      keywords: [product.title, product.brand, categoryName ?? '', product.subTitle].filter(Boolean),
      structuredData: [...this.globalStructuredData(), this.productStructuredData(product, categoryName, price)]
    });
  }

  setDefaultPage() {
    this.update({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: '/'
    });
  }

  private update(config: SeoConfig) {
    const title = config.title || DEFAULT_TITLE;
    const description = config.description || DEFAULT_DESCRIPTION;
    const url = this.absoluteUrl(config.path || '/');
    const image = this.absoluteUrl(config.image || DEFAULT_IMAGE);
    const keywords = [...DEFAULT_KEYWORDS, ...(config.keywords ?? [])]
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: Array.from(new Set(keywords)).join(', ') });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: config.type || 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.setCanonical(url);
    this.setStructuredData(config.structuredData ?? this.globalStructuredData());
  }

  private globalStructuredData(settings?: GeneralSettings): Record<string, unknown>[] {
    const siteUrl = this.siteUrl();
    const schemas: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: siteUrl,
        logo: settings?.mainLogo || undefined,
        sameAs: settings?.socialMediaLinks.map((link) => link.link).filter(Boolean)
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/products?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ];

    const firstLocation = settings?.storeLocations[0];
    if (firstLocation || settings?.walletPhone) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'AutoPartsStore',
        name: SITE_NAME,
        url: siteUrl,
        telephone: settings?.walletPhone || undefined,
        address: firstLocation?.detailedLocation,
        hasMap: firstLocation?.mapLink
      });
    }

    return schemas;
  }

  private productStructuredData(
    product: EcommerceProduct,
    categoryName: string | undefined,
    price: number | null
  ): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.subTitle || `Kapomatic automotive spare part${categoryName ? ` in ${categoryName}` : ''}.`,
      image: product.images.map((image) => this.absoluteUrl(image.src)).filter(Boolean),
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      category: categoryName,
      sku: product.id,
      offers: {
        '@type': 'Offer',
        url: this.absoluteUrl(`/products/${encodeURIComponent(product.id)}`),
        priceCurrency: product.currency || 'EGP',
        price: price || undefined,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      },
      aggregateRating:
        product.rating > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewsCount || 1
            }
          : undefined
    };
  }

  private setCanonical(url: string) {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setStructuredData(data: Record<string, unknown> | Record<string, unknown>[]) {
    let script = this.document.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-seo="true"]');
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(this.removeUndefined(data));
  }

  private absoluteUrl(path: string): string {
    if (!path) return this.siteUrl();
    if (/^(https?:|data:)/i.test(path)) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.siteUrl()}${normalizedPath}`;
  }

  private siteUrl(): string {
    const configured = environment.site_url.replace(/\/+$/, '');
    if (configured) return configured;
    if (isPlatformBrowser(this.platformId)) return this.document.location.origin;
    return FALLBACK_SITE_URL;
  }

  private removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.removeUndefined(entry));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined && entry !== '')
        .map(([key, entry]) => [key, this.removeUndefined(entry)])
    );
  }
}
