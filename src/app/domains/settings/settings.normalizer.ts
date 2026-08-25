import {
  DEFAULT_STOREFRONT_SETTINGS,
  PersistedStorefrontSettingsV1,
  SocialMediaLink,
  StoreLocation,
  StorefrontSettings
} from './settings.models';

export function normalizeStorefrontSettings(source: unknown): StorefrontSettings {
  const root = asRecord(source);
  const value = firstRecord(root['data'], root['result'], source);

  return {
    mainLogo: safeImageSource(readString(value['mainLogo'] ?? value['logo'] ?? value['logoImage'])),
    mainColor: normalizeHexColor(readString(value['mainColor'])),
    currencyCode: normalizeCurrency(value['currencyCode'] ?? value['currency']),
    freeShippingMinimumAmount: nonNegativeNumber(value['freeShippingMinimumAmount']),
    walletPhone: readString(value['walletPhone']).slice(0, 30),
    instapayLink: safeHttpUrl(readString(value['instapayLink'])),
    storeLocations: normalizeLocations(value['storeLocations']),
    socialMediaLinks: normalizeSocialLinks(value['socialMediaLinks'])
  };
}

export function readPersistedSettings(source: unknown): PersistedStorefrontSettingsV1 | null {
  const record = asRecord(source);
  if (record['version'] !== 1 || typeof record['updatedAt'] !== 'string' || !isRecord(record['settings'])) {
    return null;
  }

  const parsedDate = Date.parse(record['updatedAt']);
  if (!Number.isFinite(parsedDate)) return null;

  return {
    version: 1,
    updatedAt: new Date(parsedDate).toISOString(),
    settings: normalizeStorefrontSettings(record['settings'])
  };
}

function normalizeLocations(source: unknown): readonly StoreLocation[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((entry, index) => {
      const record = asRecord(entry);
      const name = readString(record['name']);
      const detailedLocation = readString(record['detailedLocation']);
      const mapLink = safeHttpUrl(readString(record['mapLink']));
      if (!name || !mapLink) return null;
      return {
        id: readString(record['id'] ?? record['_id']) || `location-${index}`,
        name,
        detailedLocation,
        mapLink
      };
    })
    .filter((item): item is StoreLocation => item !== null);
}

function normalizeSocialLinks(source: unknown): readonly SocialMediaLink[] {
  if (!Array.isArray(source)) return [];
  return source
    .map((entry, index) => {
      const record = asRecord(entry);
      const name = readString(record['name']);
      const link = safeHttpUrl(readString(record['link']));
      if (!name || !link) return null;
      return {
        id: readString(record['id'] ?? record['_id']) || `social-${index}`,
        name,
        link
      };
    })
    .filter((item): item is SocialMediaLink => item !== null);
}

function normalizeHexColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : DEFAULT_STOREFRONT_SETTINGS.mainColor;
}

function normalizeCurrency(value: unknown): string {
  const currency = readString(value).toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_STOREFRONT_SETTINGS.currencyCode;
}

function nonNegativeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function safeImageSource(value: string): string {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^https:\/\//i.test(value)) return value;
  return /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(value) ? value : '';
}

function safeHttpUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function firstRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
