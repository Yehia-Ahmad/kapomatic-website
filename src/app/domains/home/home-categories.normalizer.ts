import { ImageSourceNormalizer, safeImageSource } from '../../core/security/public-url.utils';
import { HomeCategory } from './home.models';
import { HomeCategoriesContractError, HomeCategoryDto } from './home-categories.models';

export function normalizeHomeCategoriesResponse(
  source: unknown,
  normalizeImage: ImageSourceNormalizer = safeImageSource
): readonly HomeCategory[] {
  const root = asRecord(source);
  const data = asRecord(root['data']);
  if (root['success'] !== true || !Array.isArray(data['categories'])) {
    throw new HomeCategoriesContractError('HOME_CATEGORIES_ENVELOPE_INVALID');
  }

  const ids = new Set<string>();
  return data['categories'].map((entry) => {
    const dto = readCategoryDto(entry);
    if (ids.has(dto.id)) throw new HomeCategoriesContractError('HOME_CATEGORY_ID_DUPLICATED');
    ids.add(dto.id);
    const normalizedImage = dto.image ? normalizeImage(dto.image.url) : '';
    return {
      id: dto.id,
      name: dto.name,
      activeSlug: dto.slug,
      localizedSlugs: {
        ar: dto.localizedSlugs.ar || undefined,
        en: dto.localizedSlugs.en || undefined
      },
      imageUrl: normalizedImage || null,
      imageAlt: dto.image?.alt || dto.name,
      productsCount: dto.productsCount
    };
  });
}

function readCategoryDto(source: unknown): HomeCategoryDto {
  const value = asRecord(source);
  const id = requiredString(value['id'], 'HOME_CATEGORY_ID_INVALID');
  const name = requiredString(value['name'], 'HOME_CATEGORY_NAME_INVALID');
  const slug = requiredString(value['slug'], 'HOME_CATEGORY_SLUG_INVALID');
  const localizedSlugsSource = asRequiredRecord(
    value['localizedSlugs'],
    'HOME_CATEGORY_LOCALIZED_SLUGS_INVALID'
  );
  const productsCount = readProductsCount(value['productsCount']);
  return {
    id,
    name,
    slug,
    localizedSlugs: {
      ar: nullableString(localizedSlugsSource['ar'], 'HOME_CATEGORY_AR_SLUG_INVALID'),
      en: nullableString(localizedSlugsSource['en'], 'HOME_CATEGORY_EN_SLUG_INVALID')
    },
    image: readImageDto(value['image'], name),
    productsCount
  };
}

function readImageDto(source: unknown, fallbackAlt: string): HomeCategoryDto['image'] {
  if (source === null || source === undefined) return null;
  const value = asRequiredRecord(source, 'HOME_CATEGORY_IMAGE_INVALID');
  const url = optionalString(value['url']);
  if (!url) return null;
  return { url, alt: optionalString(value['alt']) || fallbackAlt };
}

function readProductsCount(source: unknown): number {
  if (typeof source !== 'number' || !Number.isFinite(source) || source < 0) {
    throw new HomeCategoriesContractError('HOME_CATEGORY_PRODUCTS_COUNT_INVALID');
  }
  return Math.trunc(source);
}

function nullableString(source: unknown, code: string): string | null {
  if (source === null || source === undefined) return null;
  if (typeof source !== 'string') throw new HomeCategoriesContractError(code);
  return source.trim() || null;
}

function requiredString(source: unknown, code: string): string {
  const value = optionalString(source);
  if (!value) throw new HomeCategoriesContractError(code);
  return value;
}

function optionalString(source: unknown): string {
  return typeof source === 'string' ? source.trim() : '';
}

function asRequiredRecord(source: unknown, code: string): Record<string, unknown> {
  const value = asRecord(source);
  if (Object.keys(value).length === 0) throw new HomeCategoriesContractError(code);
  return value;
}

function asRecord(source: unknown): Record<string, unknown> {
  return source && typeof source === 'object' && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};
}
