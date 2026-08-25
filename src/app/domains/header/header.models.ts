import { SupportedLocale } from '../../core/http/api-endpoints';

export interface HeaderTopBar {
  readonly visible: boolean;
  readonly text: string;
  readonly linkText: string;
  readonly linkUrl: string;
  readonly external: boolean;
  readonly openInNewTab: boolean;
  readonly backgroundColor: string;
  readonly textColor: string;
}

export interface HeaderContact {
  readonly showWhatsapp: boolean;
  readonly whatsappNumber: string;
  readonly showPhone: boolean;
  readonly phoneNumber: string;
  readonly showEmail: boolean;
  readonly email: string;
}

export interface HeaderNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly external: boolean;
  readonly openInNewTab: boolean;
  readonly children: readonly HeaderNavigationItem[];
}

export interface HeaderConfig {
  readonly source: 'public-header' | 'safe-fallback';
  readonly locale: SupportedLocale;
  readonly enabled: boolean;
  readonly sticky: boolean;
  readonly showSearch: boolean;
  readonly showCart: boolean;
  readonly showLanguageSwitcher: boolean;
  readonly showMobileMenu: boolean;
  readonly desktopLogoUrl: string;
  readonly mobileLogoUrl: string;
  readonly logoAltText: string;
  readonly topBar: HeaderTopBar;
  readonly contact: HeaderContact;
  readonly navigation: readonly HeaderNavigationItem[];
  readonly actions: readonly HeaderNavigationItem[];
}
