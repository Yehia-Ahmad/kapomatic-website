import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { isWhatsappUrl, whatsappLinkFromPhone } from '../../core/security/public-url.utils';
import { HeaderNavigationItem } from '../../domains/header/header.models';
import { HeaderStore } from '../../domains/header/header.store';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { MobileNavDrawerComponent } from '../mobile-nav-drawer/mobile-nav-drawer.component';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { SiteHeaderComponent } from '../site-header/site-header.component';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    FaIconComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    MobileNavDrawerComponent,
    CartDrawerComponent
  ],
  templateUrl: './storefront-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorefrontShellComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly header = inject(HeaderStore);
  protected readonly settings = inject(StorefrontSettingsStore);
  protected readonly navDrawerOpen = signal(false);
  protected readonly cartDrawerOpen = signal(false);
  protected readonly overlayOpen = computed(() => this.navDrawerOpen() || this.cartDrawerOpen());
  protected readonly whatsappIcon = faWhatsapp;
  @ViewChild(SiteHeaderComponent) private siteHeader?: SiteHeaderComponent;

  protected readonly logoUrl = computed(
    () => this.header.config().desktopLogoUrl || this.settings.settings().mainLogo
  );
  protected readonly mobileLogoUrl = computed(() => this.header.config().mobileLogoUrl || this.logoUrl());
  protected readonly navigation = computed<readonly HeaderNavigationItem[]>(() => {
    const dynamic = [...this.header.config().navigation, ...this.header.config().actions];
    const home = staticItem('home', this.locale.translate('nav.home'), '/');
    const catalog = staticItem('catalog', this.locale.translate('nav.catalog'), '/search');
    const locations = staticItem('locations', this.locale.translate('nav.locations'), '/branches');
    if (dynamic.length === 0) return [home, catalog, locations];
    if (this.header.config().source === 'safe-fallback') {
      return [home, { ...catalog, children: deduplicateNavigation(dynamic) }, locations];
    }
    return deduplicateNavigation(dynamic);
  });
  protected readonly whatsappHref = computed(() => {
    const contact = this.header.config().contact;
    if (contact.showWhatsapp) {
      const fromNumber = whatsappLinkFromPhone(contact.whatsappNumber);
      if (fromNumber) return fromNumber;
    }
    return this.settings.settings().socialMediaLinks.find((social) => isWhatsappUrl(social.link))?.link ?? '';
  });

  constructor() {
    effect(() => this.header.load(this.locale.locale()), { allowSignalWrites: true });
  }

  protected closeDrawer(): void {
    this.navDrawerOpen.set(false);
    queueMicrotask(() => this.siteHeader?.focusMenuButton());
  }

  protected openCartDrawer(): void {
    this.navDrawerOpen.set(false);
    this.cartDrawerOpen.set(true);
  }

  protected closeCartDrawer(): void {
    this.cartDrawerOpen.set(false);
    queueMicrotask(() => this.siteHeader?.focusCartButton());
  }
}

function staticItem(id: string, label: string, url: string): HeaderNavigationItem {
  return { id, label, url, external: false, openInNewTab: false, children: [] };
}

function deduplicateNavigation(items: readonly HeaderNavigationItem[]): readonly HeaderNavigationItem[] {
  const ids = new Set<string>();
  return items.filter((item) => {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}
