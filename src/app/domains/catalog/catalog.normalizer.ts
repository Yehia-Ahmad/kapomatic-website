import { SupportedLocale } from '../../core/http/api-endpoints';
import { ImageSourceNormalizer, safeImageSource } from '../../core/security/public-url.utils';
import { normalizePrice } from '../../shared/pricing/normalized-price';
import {
  AlternateSlugs,
  CatalogCategory,
  CatalogContractError,
  CatalogFilterGroup,
  CatalogPagination,
  CatalogProduct,
  CatalogProductImage,
  CatalogSeo,
  CatalogSpecification,
  CategoryProductsResult,
  SearchProductsResult
} from './catalog.models';

export function normalizeCategoryResponse(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): CatalogCategory {
  const root = asRecord(source);
  return normalizeCategory(root['data'], root['seo'], locale, normalizeImage);
}

export function normalizeCategoryProductsResponse(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): CategoryProductsResult {
  const root = asRecord(source);
  const data = asRecord(root['data']);
  if (!Array.isArray(data['products'])) throw new CatalogContractError('CATEGORY_PRODUCTS_NOT_ARRAY');
  const products = data['products'].map((item) =>
    normalizeProductData(item, undefined, locale, normalizeImage)
  );
  return {
    category: normalizeCategory(data, root['seo'], locale, normalizeImage),
    products,
    pagination: normalizePagination(data['pagination'], products.length)
  };
}

export function normalizeProductResponse(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): CatalogProduct {
  const root = asRecord(source);
  return normalizeProductData(root['data'], root['seo'], locale, normalizeImage);
}

export function normalizeSearchProductsResponse(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): SearchProductsResult {
  const root = asRecord(source);
  if (!Array.isArray(root['products'])) throw new CatalogContractError('SEARCH_PRODUCTS_NOT_ARRAY');
  const products = root['products'].map((item) =>
    normalizeProductData(item, undefined, locale, normalizeImage)
  );
  return {
    products,
    pagination: normalizePagination(root['pagination'], products.length)
  };
}

export function normalizeFilterGroups(source: unknown): readonly CatalogFilterGroup[] {
  if (!Array.isArray(source)) throw new CatalogContractError('CATEGORY_FILTERS_NOT_ARRAY');
  return source.flatMap((entry): readonly CatalogFilterGroup[] => {
    const value = asRecord(entry);
    const title = readString(value['title'] ?? value['name'] ?? value['label']);
    const rawValues = Array.isArray(value['values']) ? value['values'] : [];
    if (!title || value['isVisible'] === false) return [];
    const seen = new Set<string>();
    const values = rawValues.flatMap((item) => {
      const itemRecord = asRecord(item);
      const label = readScalar(itemRecord['value'] ?? itemRecord['label'] ?? itemRecord['name'] ?? item);
      if (!label || seen.has(label)) return [];
      seen.add(label);
      const count = finiteInteger(itemRecord['count']);
      return [
        {
          id: stableIdentity(label),
          label,
          count: count !== null && count >= 0 ? count : null,
          disabled: value['disabled'] === true || itemRecord['disabled'] === true || count === 0
        }
      ];
    });
    return values.length > 0 ? [{ id: filterQueryKey(title), title, values }] : [];
  });
}

export function filterQueryKey(title: string): string {
  return `f_${encodeURIComponent(title.trim())}`;
}

export function filterTitleFromQueryKey(key: string): string {
  if (!key.startsWith('f_')) return '';
  try {
    return decodeURIComponent(key.slice(2)).trim();
  } catch {
    return '';
  }
}

function normalizeCategory(
  source: unknown,
  seoSource: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer
): CatalogCategory {
  const value = asRecord(source);
  const id = readId(value);
  const name = readString(value['name']);
  const slug = readString(value['slug']);
  if (!id || !name || !slug) throw new CatalogContractError('CATEGORY_REQUIRED_FIELDS_INVALID');
  const seo = normalizeSeo(seoSource, `/${locale}/categories/${encodeURIComponent(slug)}`);
  return {
    id,
    name,
    description: readString(value['description']),
    slug,
    imageUrl: normalizeImage(
      value['publicImageUrl'] ?? value['imageUrl'] ?? value['image'] ?? value['imageBase64']
    ),
    imageAlt: readString(value['imageAlt']) || name,
    alternateSlugs: alternateSlugsFromPaths(seo.alternatePaths),
    seo
  };
}

function normalizeProductData(
  source: unknown,
  seoSource: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer
): CatalogProduct {
  const value = asRecord(source);
  const translations = asRecord(value['translations']);
  const activeTranslation = asRecord(translations[locale]);
  const id = readId(value);
  const name = readString(activeTranslation['name'] ?? value['name']);
  const slug = readString(activeTranslation['slug'] ?? value['slug']);
  if (!id || !name || !slug) throw new CatalogContractError('PRODUCT_REQUIRED_FIELDS_INVALID');
  const categoryValue = asRecord(value['category']);
  const categoryId = readId(categoryValue);
  const categoryName = readString(categoryValue['name']);
  const categorySlug = readString(categoryValue['slug']);
  const currency = readString(value['currency']).toUpperCase();
  const seo = normalizeSeo(seoSource, `/${locale}/products/${encodeURIComponent(slug)}`);
  const images = normalizeImages(
    value,
    name,
    readString(activeTranslation['imageAlt'] ?? value['imageAlt']) || name,
    normalizeImage
  );
  const availableQuantity = finiteInteger(value['inventoryCount'] ?? value['availableQuantity']);
  return {
    id,
    locale,
    name,
    shortDescription: readString(activeTranslation['shortDescription'] ?? value['shortDescription']),
    description: readString(activeTranslation['description'] ?? value['description']),
    brand: readString(value['brand'] ?? asRecord(value['manufacturer'])['name']),
    code: readString(value['code'] ?? value['sku']),
    slug,
    alternateSlugs: {
      ar: readString(asRecord(translations['ar'])['slug']) || alternateSlugsFromPaths(seo.alternatePaths).ar,
      en: readString(asRecord(translations['en'])['slug']) || alternateSlugsFromPaths(seo.alternatePaths).en
    },
    category:
      categoryId && categoryName && categorySlug
        ? { id: categoryId, name: categoryName, slug: categorySlug }
        : null,
    images,
    price: normalizePrice(
      {
        currency,
        retailPrice: value['retailPrice'],
        price: value['price'],
        finalVisiblePrice: value['finalVisiblePrice'],
        priceAfterDiscount: value['priceAfterDiscount'],
        discountPercentage: value['discountPercentage']
      },
      currency || 'EGP'
    ),
    availability: normalizeAvailability(value['availability'], availableQuantity),
    availableQuantity: availableQuantity !== null ? Math.max(0, Math.min(99, availableQuantity)) : null,
    specifications: normalizeSpecifications(value['specifications']),
    ...normalizeRating(value),
    seo
  };
}

function normalizeImages(
  value: Record<string, unknown>,
  productName: string,
  fallbackAlt: string,
  normalizeImage: ImageSourceNormalizer
): readonly CatalogProductImage[] {
  const gallery = Array.isArray(value['images']) ? value['images'] : [];
  const canonical = value['publicImageUrl'] ?? value['imageUrl'];
  const candidates = canonical
    ? [canonical, ...gallery]
    : gallery.length > 0
      ? gallery
      : [value['image'] ?? value['imageBase64']];
  const seen = new Set<string>();
  return candidates.flatMap((candidate, index) => {
    const record = asRecord(candidate);
    const url = normalizeImage(
      typeof candidate === 'string'
        ? candidate
        : (record['publicImageUrl'] ??
            record['url'] ??
            record['src'] ??
            record['imageUrl'] ??
            record['image'] ??
            record['imageBase64'])
    );
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [
      {
        id: readId(record) || `image-${index + 1}`,
        url,
        alt: readString(record['alt'] ?? record['imageAlt']) || fallbackAlt || productName
      }
    ];
  });
}

function normalizeSpecifications(source: unknown): readonly CatalogSpecification[] {
  if (!Array.isArray(source)) return [];
  return source.flatMap((entry, index) => {
    const value = asRecord(entry);
    const name = readString(value['name'] ?? value['title'] ?? value['key'] ?? value['label']);
    const raw = value['value'] ?? value['values'];
    const displayValue = Array.isArray(raw)
      ? raw.map(readScalar).filter(Boolean).join('، ')
      : readScalar(raw);
    return name && displayValue
      ? [{ id: `${stableIdentity(name)}-${index}`, name, value: displayValue }]
      : [];
  });
}

function normalizePagination(source: unknown, fallbackCount: number): CatalogPagination {
  const value = asRecord(source);
  const page = finiteInteger(value['page']);
  const limit = finiteInteger(value['limit']);
  const totalItems = finiteInteger(value['totalItems'] ?? value['total']);
  const totalPages = finiteInteger(value['totalPages'] ?? value['pages']);
  if (page === null || page < 1 || limit === null || limit < 1 || totalItems === null || totalItems < 0) {
    throw new CatalogContractError('CATEGORY_PAGINATION_INVALID');
  }
  const pages = totalPages !== null && totalPages >= 0 ? totalPages : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages: pages,
    hasNextPage: readBoolean(value['hasNextPage'], page < pages),
    hasPreviousPage: readBoolean(value['hasPrevPage'] ?? value['hasPreviousPage'], page > 1)
  };
}

function normalizeSeo(source: unknown, fallbackPath: string): CatalogSeo {
  const value = asRecord(source);
  const alternateUrls = asRecord(value['alternateUrls'] ?? value['alternates']);
  return {
    title: readString(value['title']),
    description: readString(value['description']),
    robots: normalizeRobots(value['robots']),
    canonicalPath: pathFromUrl(value['canonicalUrl']) || fallbackPath,
    alternatePaths: {
      ar: pathFromUrl(alternateUrls['ar']),
      en: pathFromUrl(alternateUrls['en']),
      xDefault: pathFromUrl(alternateUrls['xDefault'] ?? alternateUrls['x-default'])
    }
  };
}

function normalizeAvailability(source: unknown, quantity: number | null) {
  const value = readString(source).toLowerCase();
  if (value.endsWith('/instock') || value === 'in-stock' || value === 'instock') return 'in-stock' as const;
  if (value.endsWith('/outofstock') || value === 'out-of-stock' || value === 'outofstock') {
    return 'out-of-stock' as const;
  }
  if (quantity !== null) return quantity > 0 ? ('in-stock' as const) : ('out-of-stock' as const);
  return 'unknown' as const;
}

function normalizeRating(value: Record<string, unknown>): {
  readonly rating: number | null;
  readonly reviewCount: number | null;
} {
  const rating = finiteNumber(value['averageRating'] ?? value['rating']);
  const reviewCount = finiteInteger(value['reviewCount'] ?? value['reviewsCount']);
  return rating !== null && rating >= 0 && rating <= 5 && reviewCount !== null && reviewCount > 0
    ? { rating, reviewCount }
    : { rating: null, reviewCount: null };
}

function alternateSlugsFromPaths(paths: CatalogSeo['alternatePaths']): AlternateSlugs {
  return { ar: lastPathSegment(paths.ar), en: lastPathSegment(paths.en) };
}

function lastPathSegment(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const segment = path.split('/').filter(Boolean).at(-1);
  return segment ? decodeURIComponent(segment) : undefined;
}

function pathFromUrl(source: unknown): string | undefined {
  const value = readString(source);
  if (!value) return undefined;
  try {
    const url = new URL(value, 'https://kapomatic.invalid');
    return `${url.pathname}${url.search}`;
  } catch {
    return value.startsWith('/') ? value : undefined;
  }
}

function normalizeRobots(value: unknown): CatalogSeo['robots'] {
  const robots = readString(value).toLowerCase();
  if (robots.includes('noindex') && robots.includes('nofollow')) return 'noindex,nofollow';
  if (robots.includes('noindex')) return 'noindex,follow';
  return 'index,follow';
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readId(value: Record<string, unknown>): string {
  return readString(value['id'] ?? value['_id']);
}

function readScalar(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 5000) : '';
}

function finiteNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteInteger(value: unknown): number | null {
  const number = finiteNumber(value);
  return number === null ? null : Math.trunc(number);
}

function stableIdentity(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
