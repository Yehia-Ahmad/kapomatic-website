import { SupportedLocale } from '../../core/http/api-endpoints';
import { safeImageSource, safePublicLink } from '../../core/security/public-url.utils';
import { contrastRatio } from '../../core/theme/theme.utils';
import { HeaderConfig, HeaderNavigationItem } from './header.models';
import { normalizePublicRouteIndex } from '../catalog/public-route-index';

export function normalizeHeaderConfig(source: unknown, locale: SupportedLocale): HeaderConfig {
  const root = asRecord(source);
  const data = asRecord(root['data']);
  const value = Object.keys(data).length > 0 ? data : root;
  const settings = asRecord(value['settings']);
  const topBar = asRecord(settings['topBar']);
  const contact = asRecord(settings['contact']);
  const background = safeHex(topBar['backgroundColor']) || '#16181D';
  const configuredText = safeHex(topBar['textColor']);
  const textColor =
    configuredText && contrastRatio(background, configuredText) >= 4.5
      ? configuredText
      : contrastRatio(background, '#FFFFFF') >= 4.5
        ? '#FFFFFF'
        : '#111827';
  const topBarLink = safePublicLink(topBar['linkUrl']);
  const navigation = normalizeNavigation(value['navigation'], locale, 0);
  const actions = normalizeNavigation(value['actions'], locale, 0);

  return {
    source: 'public-header',
    locale,
    enabled: readBoolean(settings['isEnabled'], true),
    sticky: readBoolean(settings['isSticky'], true),
    showSearch: readBoolean(settings['showSearch'], true),
    showCart: readBoolean(settings['showCart'], true),
    showLanguageSwitcher: readBoolean(settings['showLanguageSwitcher'], true),
    showMobileMenu: readBoolean(settings['showMobileMenu'], true),
    desktopLogoUrl: safeImageSource(settings['logoUrl']),
    mobileLogoUrl: safeImageSource(settings['mobileLogoUrl'] ?? settings['logoUrl']),
    logoAltText: readLocalized(settings, 'logoAltText', locale),
    topBar: {
      visible: readBoolean(settings['showTopBar'], false) && Boolean(readLocalized(topBar, 'text', locale)),
      text: readLocalized(topBar, 'text', locale),
      linkText: readLocalized(topBar, 'linkText', locale),
      linkUrl: topBarLink?.url ?? '',
      external: topBarLink?.kind === 'external',
      openInNewTab: readBoolean(topBar['openInNewTab'], false),
      backgroundColor: background,
      textColor
    },
    contact: {
      showWhatsapp: readBoolean(contact['showWhatsapp'], false),
      whatsappNumber: readString(contact['whatsappNumber']).slice(0, 40),
      showPhone: readBoolean(contact['showPhone'], false),
      phoneNumber: readString(contact['phoneNumber']).slice(0, 40),
      showEmail: readBoolean(contact['showEmail'], false),
      email: safeEmail(contact['email'])
    },
    navigation,
    actions
  };
}

export function fallbackHeaderConfig(locale: SupportedLocale): HeaderConfig {
  return {
    source: 'safe-fallback',
    locale,
    enabled: true,
    sticky: true,
    showSearch: true,
    showCart: true,
    showLanguageSwitcher: true,
    showMobileMenu: true,
    desktopLogoUrl: '',
    mobileLogoUrl: '',
    logoAltText: '',
    topBar: {
      visible: false,
      text: '',
      linkText: '',
      linkUrl: '',
      external: false,
      openInNewTab: false,
      backgroundColor: '#16181D',
      textColor: '#FFFFFF'
    },
    contact: {
      showWhatsapp: false,
      whatsappNumber: '',
      showPhone: false,
      phoneNumber: '',
      showEmail: false,
      email: ''
    },
    navigation: [],
    actions: []
  };
}

export function normalizeCategoryNavigation(
  source: unknown,
  locale: SupportedLocale
): readonly HeaderNavigationItem[] {
  return normalizePublicRouteIndex(source, 'category', locale).map((entry) => ({
    id: `category-${entry.id}`,
    label: entry.label,
    url: entry.path,
    external: false,
    openInNewTab: false,
    children: []
  }));
}

function normalizeNavigation(
  source: unknown,
  locale: SupportedLocale,
  depth: number
): readonly HeaderNavigationItem[] {
  if (!Array.isArray(source) || depth >= 3) return [];
  return source
    .map((entry) => {
      const value = asRecord(entry);
      if (readBoolean(value['isEnabled'], true) === false) return null;
      const id = readString(value['id'] ?? value['_id']);
      const label = readLocalized(value, 'label', locale);
      const link = safePublicLink(value['url']);
      const children = normalizeNavigation(value['children'], locale, depth + 1);
      if (!id || !label || (!link && children.length === 0)) return null;
      return {
        id,
        label,
        url: link?.url ?? '',
        external: link?.kind === 'external',
        openInNewTab: readBoolean(value['openInNewTab'], false),
        children
      };
    })
    .filter((item): item is HeaderNavigationItem => item !== null);
}

function readLocalized(source: Record<string, unknown>, field: string, locale: SupportedLocale): string {
  const translations = asRecord(source['translations']);
  const translation = asRecord(translations[locale]);
  const direct = source[field];
  const localized = asRecord(direct);
  return (
    readString(translation[field]) ||
    readString(source[`${field}${locale === 'ar' ? 'Ar' : 'En'}`]) ||
    readString(localized[locale]) ||
    readString(direct)
  );
}

function safeHex(source: unknown): string {
  const value = readString(source);
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : '';
}

function safeEmail(source: unknown): string {
  const value = readString(source).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
}

function readBoolean(source: unknown, fallback: boolean): boolean {
  if (source === true || source === false) return source;
  return fallback;
}

function readString(source: unknown): string {
  return typeof source === 'string' ? source.trim() : '';
}

function asRecord(source: unknown): Record<string, unknown> {
  return source && typeof source === 'object' && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};
}
