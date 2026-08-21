import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { EcommerceProduct } from './ecommerce.service';
import { GeneralSettings } from './general-settings.service';
import { LanguageCode, TextDirection, UrlService } from './url.service';

export interface SeoConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  robots?: string;
  language: LanguageCode;
  direction: TextDirection;
  alternateUrls?: {
    ar?: string;
    en?: string;
    xDefault?: string;
  };
  og?: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
  };
  twitter?: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image: string;
  };
  structuredData?: Record<string, unknown>[];
}

export type BackendSeo = {
  metaTitle?: string;
  title?: string;
  metaDescription?: string;
  description?: string;
  keywords?: string[];
  robots?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
};

const SITE_NAME = 'Kapomatic';
const SITE_ALTERNATE_NAME = 'كابوماتيك';
const DEFAULT_IMAGE = '/favicon.ico';
const HOME_COPY: Record<LanguageCode, { title: string; description: string }> = {
  ar: {
    title: 'قطع غيار فتيس أوتوماتيك وزيوت سيارات | كابوماتيك',
    description:
      'تسوق قطع غيار فتيس أوتوماتيك وزيوت سيارات ومنتجات صيانة موثوقة من كابوماتيك داخل مصر.'
  },
  en: {
    title: 'Automatic Gearbox Parts and Car Oils | Kapomatic',
    description:
      'Shop automatic gearbox parts, car spare parts, transmission components, and car oils from Kapomatic in Egypt.'
  }
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly urls = inject(UrlService);

  setPage(config: SeoConfig): void {
    const title = config.title.trim();
    const description = config.description.trim();
    const canonicalUrl = this.urls.canonicalUrl(config.canonicalUrl);
    const image = this.urls.publicImageUrl(config.og?.image || config.twitter?.image || DEFAULT_IMAGE);
    const og = config.og ?? {
      title,
      description,
      image,
      url: canonicalUrl,
      type: 'website'
    };
    const twitter = config.twitter ?? {
      card: 'summary_large_image' as const,
      title: og.title,
      description: og.description,
      image: og.image
    };

    this.document.documentElement.lang = config.language;
    this.document.documentElement.dir = config.direction;
    this.title.setTitle(title);

    this.updateMeta('name', 'description', description);
    this.updateMeta('name', 'robots', config.robots || 'index,follow');
    this.updateMeta('property', 'og:title', og.title);
    this.updateMeta('property', 'og:description', og.description);
    this.updateMeta('property', 'og:type', og.type);
    this.updateMeta('property', 'og:url', this.urls.canonicalUrl(og.url || canonicalUrl));
    this.updateMeta('property', 'og:image', this.urls.publicImageUrl(og.image));
    this.updateMeta('property', 'og:site_name', SITE_NAME);
    this.updateMeta('name', 'twitter:card', twitter.card);
    this.updateMeta('name', 'twitter:title', twitter.title);
    this.updateMeta('name', 'twitter:description', twitter.description);
    this.updateMeta('name', 'twitter:image', this.urls.publicImageUrl(twitter.image));

    this.replaceCanonical(canonicalUrl);
    this.replaceHreflang(config.alternateUrls);
    this.replaceStructuredData(config.structuredData ?? this.globalStructuredData(config.language));
  }

  setHomePage(settings?: GeneralSettings, language: LanguageCode = 'ar'): void {
    const copy = HOME_COPY[language];
    const path = this.urls.localizedHome(language);
    const ar = this.urls.absoluteUrl(this.urls.localizedHome('ar'));
    const en = this.urls.absoluteUrl(this.urls.localizedHome('en'));

    this.setPage({
      title: copy.title,
      description: copy.description,
      canonicalUrl: this.urls.absoluteUrl(path),
      language,
      direction: this.urls.direction(language),
      alternateUrls: { ar, en, xDefault: ar },
      structuredData: this.globalStructuredData(language, settings)
    });
  }

  setProductsPage(options: {
    categoryName?: string;
    categoryId?: string;
    categorySlug?: string;
    searchQuery?: string;
    targetedTitle?: string;
    language?: LanguageCode;
    filtersActive?: boolean;
  }): void {
    const language = options.language ?? 'ar';
    const searchQuery = options.searchQuery?.trim();
    const categoryName = options.categoryName?.trim();
    const targetedTitle = options.targetedTitle?.trim();
    const isArabic = language === 'ar';
    const title = searchQuery
      ? isArabic
        ? `نتائج البحث عن ${searchQuery} | كابوماتيك`
        : `Search results for ${searchQuery} | Kapomatic`
      : categoryName
        ? `${categoryName} | ${isArabic ? SITE_ALTERNATE_NAME : SITE_NAME}`
        : targetedTitle
          ? `${targetedTitle} | ${isArabic ? SITE_ALTERNATE_NAME : SITE_NAME}`
          : HOME_COPY[language].title;
    const description = searchQuery
      ? isArabic
        ? `نتائج بحث كابوماتيك عن ${searchQuery}.`
        : `Search Kapomatic for ${searchQuery}.`
      : categoryName
        ? isArabic
          ? `تسوق ${categoryName} من كابوماتيك.`
          : `Shop ${categoryName} from Kapomatic.`
        : HOME_COPY[language].description;
    const path = searchQuery
      ? `${this.urls.localizedSearch(language)}?q=${encodeURIComponent(searchQuery)}`
      : options.categorySlug
        ? this.urls.localizedCategory(language, options.categorySlug)
        : this.urls.localizedHome(language);
    const robots = searchQuery || options.filtersActive ? 'noindex,follow' : 'index,follow';

    this.setPage({
      title,
      description,
      canonicalUrl: options.filtersActive && options.categorySlug
        ? this.urls.absoluteUrl(this.urls.localizedCategory(language, options.categorySlug))
        : this.urls.absoluteUrl(path),
      robots,
      language,
      direction: this.urls.direction(language)
    });
  }

  setProductPage(product: EcommerceProduct, categoryName?: string, language: LanguageCode = 'ar'): void {
    const slug = product.slug || product.id;
    const price = this.visibleProductPrice(product);
    const description =
      product.subTitle ||
      (language === 'ar'
        ? `اشتر ${product.title} من كابوماتيك.`
        : `Buy ${product.title} from Kapomatic.`);
    const canonicalUrl = this.urls.absoluteUrl(this.urls.localizedProduct(language, slug));

    this.setPage({
      title: `${product.title} | ${language === 'ar' ? SITE_ALTERNATE_NAME : SITE_NAME}`,
      description,
      canonicalUrl,
      language,
      direction: this.urls.direction(language),
      og: {
        title: product.title,
        description,
        image: product.imageSrc,
        url: canonicalUrl,
        type: 'product'
      },
      structuredData: [
        ...this.globalStructuredData(language),
        this.productStructuredData(product, categoryName, price, canonicalUrl)
      ]
    });
  }

  setNoIndexPage(options: {
    title: string;
    description: string;
    path: string;
    language: LanguageCode;
    follow: boolean;
  }): void {
    this.setPage({
      title: options.title,
      description: options.description,
      canonicalUrl: this.urls.absoluteUrl(options.path),
      robots: options.follow ? 'noindex,follow' : 'noindex,nofollow',
      language: options.language,
      direction: this.urls.direction(options.language),
      structuredData: []
    });
  }

  setDefaultPage(language: LanguageCode = 'ar'): void {
    this.setHomePage(undefined, language);
  }

  fromBackend(
    backendSeo: BackendSeo | null | undefined,
    fallback: {
      title: string;
      description: string;
      canonicalUrl: string;
      language: LanguageCode;
      image?: string;
      type?: string;
      robots?: string;
      structuredData?: Record<string, unknown>[];
      alternateUrls?: SeoConfig['alternateUrls'];
    }
  ): SeoConfig {
    const title = backendSeo?.metaTitle || backendSeo?.title || fallback.title;
    const description = backendSeo?.metaDescription || backendSeo?.description || fallback.description;
    const robots =
      backendSeo?.robots ||
      this.robotsFromFlags(backendSeo?.robotsIndex, backendSeo?.robotsFollow) ||
      fallback.robots ||
      'index,follow';

    return {
      title,
      description,
      canonicalUrl: fallback.canonicalUrl,
      robots,
      language: fallback.language,
      direction: this.urls.direction(fallback.language),
      alternateUrls: fallback.alternateUrls,
      og: {
        title: backendSeo?.ogTitle || title,
        description: backendSeo?.ogDescription || description,
        image: backendSeo?.ogImage || fallback.image || DEFAULT_IMAGE,
        url: fallback.canonicalUrl,
        type: fallback.type || 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title: backendSeo?.twitterTitle || backendSeo?.ogTitle || title,
        description: backendSeo?.twitterDescription || backendSeo?.ogDescription || description,
        image: backendSeo?.twitterImage || backendSeo?.ogImage || fallback.image || DEFAULT_IMAGE
      },
      structuredData: fallback.structuredData ?? []
    };
  }

  globalStructuredData(language: LanguageCode = 'ar', settings?: GeneralSettings): Record<string, unknown>[] {
    const siteUrl = this.urls.siteOrigin();
    const schemas: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        url: siteUrl,
        logo: settings?.mainLogo ? this.urls.publicImageUrl(settings.mainLogo) : undefined,
        sameAs: settings?.socialMediaLinks.map((link) => link.link).filter(Boolean)
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        url: siteUrl,
        inLanguage: language === 'ar' ? 'ar-EG' : 'en-EG',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/${language}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      }
    ];

    const firstLocation = settings?.storeLocations[0];
    if (firstLocation || settings?.websitePhone || settings?.walletPhone) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'AutoPartsStore',
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAME,
        url: siteUrl,
        telephone: settings?.websitePhone || settings?.walletPhone || undefined,
        address: firstLocation?.detailedLocation,
        hasMap: firstLocation?.mapLink,
        image: settings?.mainLogo ? this.urls.publicImageUrl(settings.mainLogo) : undefined,
        sameAs: settings?.socialMediaLinks.map((link) => link.link).filter(Boolean)
      });
    }

    return schemas;
  }

  breadcrumbStructuredData(items: { name: string; url: string }[]): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.urls.absoluteUrl(item.url)
      }))
    };
  }

  itemListStructuredData(products: EcommerceProduct[], language: LanguageCode): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: products
        .filter((product) => product.slug || product.id)
        .map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: this.urls.absoluteUrl(this.urls.localizedProduct(language, product.slug || product.id)),
          name: product.title,
          image: product.imageSrc && !product.imageSrc.startsWith('data:')
            ? this.urls.publicImageUrl(product.imageSrc)
            : undefined
        }))
    };
  }

  productStructuredData(
    product: EcommerceProduct,
    categoryName: string | undefined,
    price: number | null,
    canonicalUrl: string
  ): Record<string, unknown> {
    const images = product.images
      .map((image) => image.src)
      .filter((src) => src && !src.startsWith('data:'))
      .map((src) => this.urls.publicImageUrl(src));

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.subTitle || undefined,
      image: images.length ? images : undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      category: categoryName,
      sku: product.sku || product.code || product.id || undefined,
      offers:
        price !== null
          ? {
              '@type': 'Offer',
              url: canonicalUrl,
              priceCurrency: product.currency || 'EGP',
              price,
              availability: product.inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock'
            }
          : undefined,
      aggregateRating:
        product.rating > 0 && product.reviewsCount > 0
          ? {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewsCount
            }
          : undefined
    };
  }

  visibleProductPrice(product: EcommerceProduct): number | null {
    if (product.hasDiscount && product.priceAfterDiscount !== null) return product.priceAfterDiscount;
    if (product.retailPrice > 0) return product.retailPrice;
    if (product.price > 0) return product.price;
    return null;
  }

  private updateMeta(attribute: 'name' | 'property', key: string, content: string): void {
    const selector = `meta[${attribute}="${this.escapeSelector(key)}"]`;
    const duplicates = Array.from(this.document.head.querySelectorAll<HTMLMetaElement>(selector));
    const first = duplicates.shift();
    for (const duplicate of duplicates) duplicate.remove();

    if (first) {
      first.setAttribute(content ? 'content' : 'content', content);
      return;
    }

    const tag = this.document.createElement('meta');
    tag.setAttribute(attribute, key);
    tag.setAttribute('content', content);
    this.document.head.appendChild(tag);
  }

  private replaceCanonical(url: string): void {
    this.removeHeadElements('link[rel="canonical"]');
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  private replaceHreflang(alternateUrls: SeoConfig['alternateUrls']): void {
    this.removeHeadElements('link[rel="alternate"][hreflang]');
    if (!alternateUrls) return;

    const links: [string, string | undefined][] = [
      ['ar-EG', alternateUrls.ar],
      ['en-EG', alternateUrls.en],
      ['x-default', alternateUrls.xDefault]
    ];

    for (const [hreflang, url] of links) {
      if (!url) continue;
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      link.setAttribute('href', this.urls.canonicalUrl(url));
      this.document.head.appendChild(link);
    }
  }

  private replaceStructuredData(data: Record<string, unknown>[]): void {
    this.removeHeadElements('script[type="application/ld+json"][data-seo="true"]');
    for (const item of data) {
      const cleaned = this.removeUndefined(item);
      if (!cleaned || (typeof cleaned === 'object' && Object.keys(cleaned).length === 0)) continue;
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(cleaned);
      this.document.head.appendChild(script);
    }
  }

  private removeHeadElements(selector: string): void {
    for (const element of Array.from(this.document.head.querySelectorAll(selector))) {
      element.remove();
    }
  }

  private robotsFromFlags(index?: boolean, follow?: boolean): string {
    if (index === undefined && follow === undefined) return '';
    return `${index === false ? 'noindex' : 'index'},${follow === false ? 'nofollow' : 'follow'}`;
  }

  private removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.removeUndefined(entry)).filter((entry) => entry !== undefined);
    }
    if (!value || typeof value !== 'object') return value;

    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined && entry !== '' && entry !== null)
      .map(([key, entry]) => [key, this.removeUndefined(entry)]);
    return Object.fromEntries(entries);
  }

  private escapeSelector(value: string): string {
    return value.replace(/"/g, '\\"');
  }
}
