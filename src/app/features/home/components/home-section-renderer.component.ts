import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBox, faChevronLeft, faChevronRight, faWrench } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../../core/security/public-url.utils';
import { HomeBundle, HomeSection } from '../../../domains/home/home.models';
import { StorefrontSettingsStore } from '../../../domains/settings/storefront-settings.store';
import { HomeCategoryCardComponent } from './home-category-card.component';
import { HomeOfferCarouselComponent } from './home-offer-carousel.component';
import { HomeProductCardComponent } from './home-product-card.component';

@Component({
  selector: 'app-home-section-renderer',
  standalone: true,
  imports: [
    FaIconComponent,
    RouterLink,
    HomeCategoryCardComponent,
    HomeOfferCarouselComponent,
    HomeProductCardComponent
  ],
  templateUrl: './home-section-renderer.component.html',
  styleUrl: './home-section-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeSectionRendererComponent {
  protected readonly locale = inject(LocaleService);
  private readonly settings = inject(StorefrontSettingsStore);
  @Input({ required: true }) section!: HomeSection;
  protected readonly icons = {
    box: faBox,
    left: faChevronLeft,
    right: faChevronRight,
    feature: faWrench
  };

  protected sectionTitle(section: HomeSection): string {
    if (section.title) return section.title;
    if (section.type === 'categories') return this.locale.translate('home.categories');
    if (section.type === 'products') return this.locale.translate('home.products');
    if (section.type === 'bundles') return this.locale.translate('home.bundles');
    return '';
  }

  protected localizedUrl(url: string): string {
    return localizedInternalUrl(url, this.locale.locale());
  }

  protected bundlePrice(bundle: HomeBundle): string {
    const amount = bundle.price?.sale ?? bundle.price?.regular;
    if (amount === undefined) return this.locale.translate('product.priceUnavailable');
    return new Intl.NumberFormat(this.locale.locale() === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: this.settings.settings().currencyCode,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
