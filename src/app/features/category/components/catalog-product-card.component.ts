import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCartPlus, faImage } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { CartStore } from '../../../domains/cart/cart.store';
import { CatalogProduct } from '../../../domains/catalog/catalog.models';
import { formatMoney } from '../../../shared/pricing/normalized-price';

@Component({
  selector: 'app-catalog-product-card',
  standalone: true,
  imports: [FaIconComponent, RouterLink],
  templateUrl: './catalog-product-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogProductCardComponent {
  protected readonly locale = inject(LocaleService);
  private readonly cart = inject(CartStore);
  protected readonly imageFailed = signal(false);
  protected readonly icons = { cart: faCartPlus, image: faImage };
  @Input({ required: true }) product!: CatalogProduct;

  protected money(amount: number): string {
    return formatMoney(amount, this.product.price?.currency ?? 'EGP', this.locale.locale());
  }

  protected canAdd(): boolean {
    return this.product.availability === 'in-stock' && this.product.price !== null;
  }

  protected addToCart(): void {
    if (!this.canAdd() || !this.product.price) return;
    const added = this.cart.add(
      this.product.id,
      {
        name: this.product.name,
        imageUrl: this.product.images[0]?.url ?? '',
        unitPrice: this.product.price.effective,
        currency: this.product.price.currency,
        slug: this.product.slug,
        alternateSlugs: this.product.alternateSlugs,
        shortDescription: this.product.shortDescription
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
}
