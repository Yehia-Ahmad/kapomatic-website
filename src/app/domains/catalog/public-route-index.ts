import { SupportedLocale } from '../../core/http/api-endpoints';
import { AlternateSlugs } from './catalog.models';

export type PublicRouteEntity = 'category' | 'product';

export interface PublicRouteEntry {
  readonly id: string;
  readonly label: string;
  readonly slug: string;
  readonly path: string;
  readonly alternateSlugs: AlternateSlugs;
}

export function normalizePublicRouteIndex(
  source: unknown,
  entity: PublicRouteEntity,
  locale: SupportedLocale
): readonly PublicRouteEntry[] {
  const root = asRecord(source);
  const rows = Array.isArray(root['data']) ? root['data'] : [];
  const collection = entity === 'category' ? 'categories' : 'products';
  const entries = new Map<string, PublicRouteEntry>();

  for (const row of rows) {
    const value = asRecord(row);
    const route = localizedRoute(value['loc'], collection);
    if (!route || route.locale !== locale) continue;
    const image = asRecord(value['image']);
    const id = entityId(image['loc'], collection);
    const label = readString(image['title']);
    if (!id || !label) continue;
    const alternates = asRecord(value['alternates']);
    entries.set(id, {
      id,
      label,
      slug: route.slug,
      path: route.path,
      alternateSlugs: {
        ar: localizedRoute(alternates['ar'], collection)?.slug,
        en: localizedRoute(alternates['en'], collection)?.slug
      }
    });
  }

  return [...entries.values()];
}

export function publicRouteSlugMap(entries: readonly PublicRouteEntry[]): Readonly<Record<string, string>> {
  return Object.fromEntries(entries.map((entry) => [entry.id, entry.slug]));
}

function localizedRoute(
  source: unknown,
  collection: 'categories' | 'products'
): { readonly locale: SupportedLocale; readonly slug: string; readonly path: string } | null {
  const value = readString(source);
  if (!value) return null;
  try {
    const url = new URL(value, 'https://kapomatic.invalid');
    const match = url.pathname.match(new RegExp(`^/(ar|en)/${collection}/([^/]+)/?$`));
    if (!match?.[1] || !match[2]) return null;
    const locale = match[1] as SupportedLocale;
    const slug = decodeURIComponent(match[2]);
    return slug ? { locale, slug, path: `/${locale}/${collection}/${slug}` } : null;
  } catch {
    return null;
  }
}

function entityId(source: unknown, collection: 'categories' | 'products'): string {
  const value = readString(source);
  if (!value) return '';
  try {
    const url = new URL(value, 'https://kapomatic.invalid');
    const categoryCollection = collection === 'categories' ? '(?:categories|categorys)' : 'products';
    const match = url.pathname.match(new RegExp(`/public/images/${categoryCollection}/([^/]+)/?$`, 'i'));
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
