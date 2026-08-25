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
import { SiteFooterComponent } from '../site-footer/site-footer.component';
import { SiteHeaderComponent } from '../site-header/site-header.component';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    FaIconComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    MobileNavDrawerComponent
  ],
  templateUrl: './storefront-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorefrontShellComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly header = inject(HeaderStore);
  protected readonly settings = inject(StorefrontSettingsStore);
  protected readonly drawerOpen = signal(false);
  protected readonly whatsappIcon = faWhatsapp;
  @ViewChild(SiteHeaderComponent) private siteHeader?: SiteHeaderComponent;

  protected readonly logoUrl = computed(
    () => this.header.config().desktopLogoUrl || this.settings.settings().mainLogo
  );
  protected readonly mobileLogoUrl = computed(() => this.header.config().mobileLogoUrl || this.logoUrl());
  protected readonly navigation = computed<readonly HeaderNavigationItem[]>(() => {
    const dynamic = [...this.header.config().navigation, ...this.header.config().actions];
    if (dynamic.length > 0) return deduplicateNavigation(dynamic);
    return [
      staticItem('home', this.locale.translate('nav.home'), '/'),
      staticItem('catalog', this.locale.translate('nav.catalog'), '/search'),
      staticItem('locations', this.locale.translate('nav.locations'), '/locations')
    ];
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
    this.drawerOpen.set(false);
    queueMicrotask(() => this.siteHeader?.focusMenuButton());
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
