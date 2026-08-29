import { SupportedLocale } from '../../core/http/api-endpoints';
import { ImageSourceNormalizer, safeImageSource, safePublicLink } from '../../core/security/public-url.utils';
import { normalizePrice as normalizeSharedPrice } from '../../shared/pricing/normalized-price';
import {
  HomeBundle,
  HomeEmbeddedCategory,
  HomeCollectionSettings,
  HomeContractError,
  HomeFeature,
  HomeOfferSlide,
  HomePageContent,
  HomeProduct,
  HomeSection,
  HomeTextLink
} from './home.models';

const SECTION_TYPES = new Set([
  'categories',
  'products',
  'bundles',
  'offers_slider',
  'marquee',
  'features_bar'
]);

export interface DynamicHomeNormalization {
  readonly content: HomePageContent;
  readonly discardedSectionCount: number;
}

export interface LegacyHomeRouteSlugs {
  readonly categories?: Readonly<Record<string, string>>;
  readonly products?: Readonly<Record<string, string>>;
}

export function normalizeDynamicHomePage(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): DynamicHomeNormalization {
  if (asRecord(source)['success'] === false) {
    throw new HomeContractError('HOME_RESPONSE_UNSUCCESSFUL');
  }
  const root = unwrapData(source);
  if (!Array.isArray(root['sections'])) throw new HomeContractError('HOME_SECTIONS_NOT_ARRAY');

  let discardedSectionCount = 0;
  const sections = root['sections']
    .map((entry) => {
      const section = normalizeSection(entry, locale, normalizeImage);
      if (!section) discardedSectionCount += 1;
      return section;
    })
    .filter((section): section is HomeSection => section !== null);

  return {
    content: {
      locale,
      source: 'dynamic-builder',
      sections,
      issues:
        discardedSectionCount > 0
          ? [
              {
                region: 'page',
                kind: 'contract',
                code: 'HOME_SECTION_DISCARDED',
                retryable: false
              }
            ]
          : [],
      capabilities: {
        dynamicBuilder: true,
        legacyCategories: false,
        legacyPromotions: false,
        bundles: sections.some((section) => section.type === 'bundles')
      }
    },
    discardedSectionCount
  };
}

export function normalizeLegacyCategories(
  selectedSource: unknown,
  activeSource: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource,
  routeSlugs: LegacyHomeRouteSlugs = {}
): readonly HomeSection[] {
  const selectedRoot = unwrapData(selectedSource);
  if (!Array.isArray(selectedRoot['categoryIds']) && !Array.isArray(selectedRoot['categories'])) {
    throw new HomeContractError('LEGACY_HOME_CATEGORIES_INVALID');
  }
  const selectedIds = readArray(selectedRoot['categoryIds']).map(readId).filter(Boolean);
  const selectedCategories = readArray(selectedRoot['categories']);
  const activeRows = unwrapArrayStrict(activeSource, 'LEGACY_ACTIVE_CATEGORIES_INVALID');
  const activeById = new Map<string, Record<string, unknown>>();

  for (const row of activeRows) {
    const record = asRecord(row);
    const category = asRecord(record['category']);
    const id = readId(category);
    if (id) activeById.set(id, record);
  }

  const orderedIds = selectedIds.length
    ? selectedIds
    : selectedCategories.map(readId).filter((id): id is string => Boolean(id));
  const categoryById = new Map(
    selectedCategories
      .map((item) => [readId(item), asRecord(item)] as const)
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry[0]))
  );
  const categories = orderedIds
    .map((id) => {
      const selected = categoryById.get(id) ?? {};
      const active = asRecord(activeById.get(id)?.['category']);
      return normalizeCategory(
        { ...active, ...selected, translations: active['translations'] ?? selected['translations'] },
        locale,
        normalizeImage,
        routeSlugs.categories?.[id]
      );
    })
    .filter((item): item is HomeEmbeddedCategory => item !== null);

  const sections: HomeSection[] = [];
  if (categories.length > 0) {
    sections.push({
      ...baseSection('legacy-categories', '', ''),
      type: 'categories',
      categories,
      settings: defaultCollectionSettings()
    });
  }

  for (const category of categories) {
    const row = activeById.get(category.id);
    if (!row) continue;
    const selectedProductIds = readArray(asRecord(row['setting'])['selectedProducts'])
      .map(readId)
      .filter(Boolean);
    if (selectedProductIds.length === 0) continue;
    const selectedSet = new Set(selectedProductIds);
    const products = readArray(row['products'])
      .filter((product) => selectedSet.has(readId(product)))
      .map((product) =>
        normalizeProduct(product, locale, normalizeImage, routeSlugs.products?.[readId(product)])
      )
      .filter((product): product is HomeProduct => product !== null)
      .slice(0, 10);
    if (products.length === 0) continue;
    sections.push({
      ...baseSection(`legacy-products-${category.id}`, category.name, ''),
      type: 'products',
      products,
      settings: {
        ...defaultCollectionSettings(),
        viewAllUrl: category.slug ? `/${locale}/categories/${category.slug}` : ''
      }
    });
  }
  return sections;
}

export function normalizeLegacyPromotions(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): readonly HomeSection[] {
  const slides = unwrapArrayStrict(source, 'LEGACY_PROMOTIONS_INVALID')
    .map((item, index) => normalizeLegacySlide(item, locale, index, normalizeImage))
    .filter((slide): slide is HomeOfferSlide => slide !== null);
  if (slides.length === 0) return [];
  return [
    {
      ...baseSection('legacy-promotions', '', ''),
      type: 'offers_slider',
      slides,
      settings: defaultSliderSettings()
    }
  ];
}

function normalizeSection(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer
): HomeSection | null {
  const value = asRecord(source);
  const type = readString(value['type']);
  const id = readId(value);
  if (!id || !SECTION_TYPES.has(type)) return null;
  const settings = asRecord(value['settings']);
  const base = baseSection(
    id,
    readLocalized(value, 'title', locale),
    readLocalized(value, 'subtitle', locale),
    readBoolean(value['fullWidth'], false),
    safeHex(value['backgroundColor'])
  );

  switch (type) {
    case 'categories': {
      const categories = readArray(settings['categories'])
        .map((item) => normalizeCategory(item, locale, normalizeImage))
        .filter((item): item is HomeEmbeddedCategory => item !== null);
      return categories.length
        ? { ...base, type, categories, settings: collectionSettings(settings, locale) }
        : null;
    }
    case 'products': {
      const products = readArray(settings['products'])
        .map((item) => normalizeProduct(item, locale, normalizeImage))
        .filter((item): item is HomeProduct => item !== null);
      return products.length
        ? { ...base, type, products, settings: collectionSettings(settings, locale) }
        : null;
    }
    case 'bundles': {
      const bundles = readArray(settings['bundles'])
        .map((item) => normalizeBundle(item, locale, normalizeImage))
        .filter((item): item is HomeBundle => item !== null);
      return bundles.length
        ? { ...base, type, bundles, settings: collectionSettings(settings, locale) }
        : null;
    }
    case 'offers_slider': {
      const slides = readArray(settings['slides'])
        .map((item, slideIndex) => normalizeSlide(item, locale, slideIndex, normalizeImage))
        .filter((item): item is HomeOfferSlide => item !== null);
      return slides.length ? { ...base, type, slides, settings: sliderSettings(settings) } : null;
    }
    case 'marquee': {
      const items = readArray(settings['items'])
        .map((item, itemIndex) => normalizeTextLink(item, locale, itemIndex, 'content'))
        .filter((item): item is HomeTextLink => item !== null);
      return items.length
        ? {
            ...base,
            type,
            items,
            backgroundColor: safeHex(settings['backgroundColor']),
            textColor: safeHex(settings['contentColor'])
          }
        : null;
    }
    case 'features_bar': {
      const items = readArray(settings['items'])
        .map((item, itemIndex) => normalizeFeature(item, locale, itemIndex, normalizeImage))
        .filter((item): item is HomeFeature => item !== null);
      return items.length ? { ...base, type, items } : null;
    }
    default:
      return null;
  }
}

function normalizeCategory(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer,
  routeSlug = ''
): HomeEmbeddedCategory | null {
  const value = asRecord(source);
  const id = readId(value);
  const name = readLocalized(value, 'name', locale) || readLocalized(value, 'title', locale);
  if (!id || !name) return null;
  const imageUrl = imageFrom(
    value['publicImageUrl'] ?? value['imageUrl'] ?? value['image'] ?? value['imageBase64'],
    normalizeImage
  );
  return {
    id,
    name,
    imageUrl,
    imageAlt: readLocalized(value, 'imageAlt', locale) || readLocalized(value, 'altText', locale) || name,
    slug: readLocalized(value, 'slug', locale) || routeSlug
  };
}

function normalizeProduct(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer,
  routeSlug = ''
): HomeProduct | null {
  const value = asRecord(source);
  const id = readId(value);
  const name = readLocalized(value, 'name', locale) || readLocalized(value, 'title', locale);
  if (!id || !name) return null;
  const inventory = finiteNumber(value['inventoryCount'] ?? value['stockQuantity']);
  const category = asRecord(value['category']);
  const imageUrl = imageFrom(
    value['publicImageUrl'] ?? value['imageUrl'] ?? value['images'] ?? value['image'] ?? value['imageBase64'],
    normalizeImage
  );
  const translations = asRecord(value['translations']);
  const alternateSlugs = {
    ar: readString(asRecord(translations['ar'])['slug']) || undefined,
    en: readString(asRecord(translations['en'])['slug']) || undefined
  };
  return {
    kind: 'product',
    id,
    categoryId: readId(category) || readString(value['categoryId']),
    name,
    code: readString(value['code'] ?? value['sku']),
    slug: readLocalized(value, 'slug', locale) || routeSlug || id,
    alternateSlugs,
    imageUrl,
    imageAlt: readLocalized(value, 'imageAlt', locale) || readLocalized(value, 'altText', locale) || name,
    price: normalizePrice(
      value['retailPrice'] ?? value['oldPrice'] ?? value['regularPrice'],
      value['priceAfterDiscount'] ?? value['salePrice'],
      value['discountPercentage']
    ),
    availability: inventory === null ? 'unknown' : inventory > 0 ? 'in-stock' : 'out-of-stock',
    availableQuantity: inventory === null ? null : Math.max(0, Math.trunc(inventory))
  };
}

function normalizeBundle(
  source: unknown,
  locale: SupportedLocale,
  normalizeImage: ImageSourceNormalizer
): HomeBundle | null {
  const value = asRecord(source);
  const id = readId(value);
  const name = readLocalized(value, 'name', locale) || readLocalized(value, 'title', locale);
  if (!id || !name || readBoolean(value['isAvailable'], true) === false) return null;
  return {
    kind: 'bundle',
    id,
    name,
    slug: readLocalized(value, 'slug', locale),
    imageUrl: imageFrom(value['imageUrl'] ?? value['image'] ?? value['imageBase64'], normalizeImage),
    imageAlt: readLocalized(value, 'altText', locale) || name,
    price: normalizePrice(
      value['originalPrice'] ?? value['oldPrice'] ?? value['regularPrice'],
      value['finalPrice'] ?? value['salePrice'],
      value['discountPercentage']
    ),
    availability: 'in-stock'
  };
}

function normalizePrice(regularSource: unknown, saleSource: unknown, discountSource: unknown) {
  const price = normalizeSharedPrice({
    retailPrice: regularSource,
    priceAfterDiscount: saleSource,
    discountPercentage: discountSource
  });
  return price
    ? {
        regular: price.original,
        sale: price.hasDiscount ? price.effective : null,
        discountPercentage: price.discountPercentage
      }
    : null;
}

function normalizeSlide(
  source: unknown,
  locale: SupportedLocale,
  index: number,
  normalizeImage: ImageSourceNormalizer
): HomeOfferSlide | null {
  const value = asRecord(source);
  const desktopImageUrl = imageFrom(value['desktopImage'], normalizeImage);
  const mobileImageUrl = imageFrom(value['mobileImage'], normalizeImage) || desktopImageUrl;
  if (!desktopImageUrl && !mobileImageUrl) return null;
  const button = asRecord(value['button']);
  const candidateUrl = readString(value['slideUrl']) || readString(button['url']);
  const link = safePublicLink(candidateUrl);
  return {
    id: readString(value['id'] ?? value['_id']) || `slide-${index}`,
    desktopImageUrl: desktopImageUrl || mobileImageUrl,
    mobileImageUrl: mobileImageUrl || desktopImageUrl,
    altText: readLocalized(value, 'altText', locale),
    title: readLocalized(value, 'title', locale),
    subtitle: readLocalized(value, 'subtitle', locale),
    linkUrl: link?.url ?? '',
    external: link?.kind === 'external',
    openInNewTab: readBoolean(value['openInNewTab'] ?? button['openInNewTab'], false),
    buttonLabel: readBoolean(button['enabled'], false) ? readLocalized(button, 'label', locale) : ''
  };
}

function normalizeLegacySlide(
  source: unknown,
  locale: SupportedLocale,
  index: number,
  normalizeImage: ImageSourceNormalizer
): HomeOfferSlide | null {
  const value = asRecord(source);
  const imageUrl = imageFrom(value['imageUrl'] ?? value['image'] ?? value['imageBase64'], normalizeImage);
  if (!imageUrl) return null;
  const link = safePublicLink(value['url'] ?? value['link'] ?? value['targetUrl']);
  const title = readLocalized(value, 'title', locale) || readLocalized(value, 'name', locale);
  return {
    id: readId(value) || `promotion-${index}`,
    desktopImageUrl: imageUrl,
    mobileImageUrl: imageUrl,
    altText: readLocalized(value, 'altText', locale) || title,
    title,
    subtitle: readLocalized(value, 'description', locale),
    linkUrl: link?.url ?? '',
    external: link?.kind === 'external',
    openInNewTab: false,
    buttonLabel: ''
  };
}

function normalizeTextLink(
  source: unknown,
  locale: SupportedLocale,
  index: number,
  textField: string
): HomeTextLink | null {
  const value = asRecord(source);
  const text = readLocalized(value, textField, locale) || readLocalized(value, 'title', locale);
  if (!text) return null;
  const link = safePublicLink(value['url'] ?? value['link']);
  return {
    id: readId(value) || `item-${index}`,
    text,
    linkUrl: link?.url ?? '',
    external: link?.kind === 'external',
    openInNewTab: readBoolean(value['openInNewTab'], false)
  };
}

function normalizeFeature(
  source: unknown,
  locale: SupportedLocale,
  index: number,
  normalizeImage: ImageSourceNormalizer
): HomeFeature | null {
  const link = normalizeTextLink(source, locale, index, 'title');
  if (!link) return null;
  const value = asRecord(source);
  return {
    ...link,
    description: readLocalized(value, 'description', locale),
    iconUrl: imageFrom(value['icon'], normalizeImage)
  };
}

function collectionSettings(
  source: Record<string, unknown>,
  locale: SupportedLocale
): HomeCollectionSettings {
  const columns = asRecord(source['columns']);
  const viewAll = asRecord(source['viewAll']);
  const viewAllLink = readBoolean(viewAll['enabled'], false) ? safePublicLink(viewAll['url']) : null;
  return {
    layout: readString(source['layout']) === 'carousel' ? 'carousel' : 'grid',
    columns: {
      desktop: boundedInteger(columns['desktop'], 1, 6, 4),
      tablet: boundedInteger(columns['tablet'], 1, 4, 3),
      mobile: boundedInteger(columns['mobile'], 1, 2, 2)
    },
    viewAllUrl: viewAllLink?.kind === 'internal' ? viewAllLink.url : '',
    viewAllLabel: readLocalized(viewAll, 'label', locale),
    imageShape: normalizeImageShape(source['imageShape']),
    imageBorderRadius: boundedInteger(source['imageBorderRadius'], 0, 48, 14),
    showCategoryName: readBoolean(source['showCategoryName'], true)
  };
}

function defaultCollectionSettings(): HomeCollectionSettings {
  return {
    layout: 'grid',
    columns: { desktop: 5, tablet: 3, mobile: 2 },
    viewAllUrl: '',
    viewAllLabel: '',
    imageShape: 'rounded',
    imageBorderRadius: 14,
    showCategoryName: true
  };
}

function normalizeImageShape(source: unknown): HomeCollectionSettings['imageShape'] {
  const value = readString(source);
  return value === 'circle' || value === 'square' ? value : 'rounded';
}

function sliderSettings(source: Record<string, unknown>) {
  return {
    autoplay: readBoolean(source['autoplay'], true),
    autoplayDelayMs: boundedInteger(source['autoplayDelay'], 3_000, 12_000, 5_000),
    loop: readBoolean(source['loop'], true),
    pauseOnHover: readBoolean(source['pauseOnHover'], true),
    showNavigation: readBoolean(source['showNavigation'], true),
    showPagination: readBoolean(source['showPagination'], true),
    imageFit: readString(source['imageFit']) === 'contain' ? ('contain' as const) : ('cover' as const)
  };
}

function defaultSliderSettings() {
  return {
    autoplay: false,
    autoplayDelayMs: 5_000,
    loop: true,
    pauseOnHover: true,
    showNavigation: true,
    showPagination: true,
    imageFit: 'cover' as const
  };
}

function baseSection(id: string, title: string, subtitle: string, fullWidth = false, backgroundColor = '') {
  return { id, title, subtitle, fullWidth, backgroundColor };
}

function imageFrom(source: unknown, normalizeImage: ImageSourceNormalizer): string {
  if (Array.isArray(source)) return imageFrom(source[0], normalizeImage);
  if (typeof source === 'string') return normalizeImage(source);
  const value = asRecord(source);
  return normalizeImage(
    value['publicImageUrl'] ??
      value['url'] ??
      value['src'] ??
      value['imageUrl'] ??
      value['image'] ??
      value['imageBase64']
  );
}

function readLocalized(source: Record<string, unknown>, field: string, locale: SupportedLocale): string {
  const translations = asRecord(source['translations']);
  const translation = asRecord(translations[locale]);
  const direct = source[field];
  const localizedDirect = asRecord(direct);
  return (
    readString(translation[field]) ||
    readString(source[`${field}${locale === 'ar' ? 'Ar' : 'En'}`]) ||
    readString(localizedDirect[locale]) ||
    readString(direct)
  );
}

function unwrapData(source: unknown): Record<string, unknown> {
  const root = asRecord(source);
  const data = asRecord(root['data']);
  return Object.keys(data).length > 0 ? data : root;
}

function unwrapArrayStrict(source: unknown, code: string): readonly unknown[] {
  if (Array.isArray(source)) return source;
  const root = asRecord(source);
  for (const key of ['data', 'result', 'items', 'images']) {
    if (Array.isArray(root[key])) return root[key] as readonly unknown[];
  }
  throw new HomeContractError(code);
}

function readArray(source: unknown): readonly unknown[] {
  return Array.isArray(source) ? source : [];
}

function readId(source: unknown): string {
  if (typeof source === 'string' || typeof source === 'number') return String(source).trim();
  const value = asRecord(source);
  return readString(value['id'] ?? value['_id'] ?? value['productId'] ?? value['categoryId']);
}

function finiteNumber(source: unknown): number | null {
  const value = Number(source);
  return source !== '' && source !== null && source !== undefined && Number.isFinite(value) ? value : null;
}

function boundedInteger(source: unknown, minimum: number, maximum: number, fallback: number): number {
  const value = finiteNumber(source);
  return value === null ? fallback : Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

function readBoolean(source: unknown, fallback: boolean): boolean {
  if (source === true || source === false) return source;
  if (source === 1 || source === '1' || source === 'true') return true;
  if (source === 0 || source === '0' || source === 'false') return false;
  return fallback;
}

function safeHex(source: unknown): string {
  const value = readString(source);
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : '';
}

function readString(source: unknown): string {
  return typeof source === 'string' ? source.trim() : '';
}

function asRecord(source: unknown): Record<string, unknown> {
  return source && typeof source === 'object' && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};
}
