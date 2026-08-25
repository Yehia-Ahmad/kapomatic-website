import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faLocationDot,
  faRotate,
  faTruckFast,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { CartStore } from '../../domains/cart/cart.store';
import { HomeStore } from '../../domains/home/home.store';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { HomeSectionRendererComponent } from './components/home-section-renderer.component';
import { HomeSkeletonComponent } from './components/home-skeleton.component';
import { HomeStatePanelComponent } from './components/home-state-panel.component';

@Component({
  standalone: true,
  imports: [
    FaIconComponent,
    RouterLink,
    HomeSectionRendererComponent,
    HomeSkeletonComponent,
    HomeStatePanelComponent
  ],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly home = inject(HomeStore);
  protected readonly settings = inject(StorefrontSettingsStore);
  protected readonly cart = inject(CartStore);
  private readonly seo = inject(SeoService);
  private readonly urls = inject(ApiUrlBuilder);
  protected readonly icons = {
    location: faLocationDot,
    refresh: faRotate,
    shipping: faTruckFast,
    warning: faTriangleExclamation
  };
  protected readonly hasLocations = computed(() => this.settings.settings().storeLocations.length > 0);
  protected readonly hasMalformedIssue = computed(() =>
    this.home.issues().some((issue) => issue.kind === 'contract')
  );

  constructor() {
    effect(() => this.home.load(this.locale.locale()), { allowSignalWrites: true });
    effect(() => this.applySeo());
  }

  protected freeShippingMessage(): string {
    const settings = this.settings.settings();
    const amount = new Intl.NumberFormat(this.locale.locale() === 'ar' ? 'ar-EG' : 'en-EG', {
      maximumFractionDigits: 2
    }).format(settings.freeShippingMinimumAmount);
    return this.locale.interpolate('home.freeShipping', {
      amount,
      currency: settings.currencyCode
    });
  }

  private applySeo(): void {
    const locale = this.locale.locale();
    const settings = this.settings.settings();
    const title =
      locale === 'ar'
        ? 'كابوماتيك | قطع غيار نواقل الحركة وزيوت السيارات'
        : 'Kapomatic | Transmission Parts and Automotive Oils';
    const description = this.locale.translate('home.description');
    const organization: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Kapomatic',
      url: this.urls.site(`/${locale}`)
    };
    if (settings.mainLogo && !settings.mainLogo.startsWith('data:')) {
      organization['logo'] = this.urls.site(settings.mainLogo);
    }
    const sameAs = settings.socialMediaLinks.map((item) => item.link);
    if (sameAs.length > 0) organization['sameAs'] = sameAs;
    const website = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Kapomatic',
      url: this.urls.site(`/${locale}`),
      inLanguage: locale === 'ar' ? 'ar-EG' : 'en-EG',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.urls.site(`/${locale}/search`)}?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
    this.seo.apply({
      title,
      description,
      path: `/${locale}`,
      locale,
      alternatePaths: { ar: '/ar', en: '/en', xDefault: '/ar' },
      imageUrl: settings.mainLogo && !settings.mainLogo.startsWith('data:') ? settings.mainLogo : undefined,
      structuredData: [organization, website]
    });
  }
}
