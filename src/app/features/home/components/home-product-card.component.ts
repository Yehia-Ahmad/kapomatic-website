import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCartPlus, faImage, faTag } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { CartStore } from '../../../domains/cart/cart.store';
import { HomeProduct } from '../../../domains/home/home.models';
import { StorefrontSettingsStore } from '../../../domains/settings/storefront-settings.store';

@Component({
  selector: 'app-home-product-card',
  standalone: true,
  imports: [FaIconComponent, RouterLink, NgTemplateOutlet],
  templateUrl: './home-product-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeProductCardComponent {
  protected readonly locale = inject(LocaleService);
  private readonly cart = inject(CartStore);
  private readonly settings = inject(StorefrontSettingsStore);
  @Input({ required: true }) product!: HomeProduct;
  protected readonly icons = { cart: faCartPlus, image: faImage, tag: faTag };

  protected price(value: number): string {
    return new Intl.NumberFormat(this.locale.locale() === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: this.settings.settings().currencyCode,
      maximumFractionDigits: 2
    }).format(value);
  }

  protected addToCart(): void {
    if (!this.canAdd()) return;
    const effectivePrice = this.product.price?.sale ?? this.product.price?.regular;
    if (effectivePrice === undefined) return;
    const added = this.cart.add(
      this.product.id,
      {
        name: this.product.name,
        imageUrl: this.product.imageUrl,
        unitPrice: effectivePrice,
        currency: this.settings.settings().currencyCode,
        slug: this.product.slug,
        alternateSlugs: this.product.alternateSlugs
      },
      {
        availability: this.product.availability,
        maximumQuantity: this.product.availableQuantity
      }
    );
    this.cart.announce(
      added
        ? this.locale.interpolate('product.added', { name: this.product.name })
        : this.locale.translate('product.addFailed')
    );
  }

  protected canAdd(): boolean {
    return this.product.availability === 'in-stock' && this.product.price !== null;
  }
}
