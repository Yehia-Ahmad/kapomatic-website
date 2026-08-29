import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faImage,
  faMinus,
  faPlus,
  faRotate,
  faShoppingBag,
  faTrashCan,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { CartFacade, CartLineStatus, CartViewLine } from '../../domains/cart/cart.facade';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { formatMoney } from '../../shared/pricing/normalized-price';

@Component({
  standalone: true,
  imports: [RouterLink, FaIconComponent],
  templateUrl: './cart.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPageComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly cart = inject(CartFacade);
  protected readonly settings = inject(StorefrontSettingsStore);
  private readonly seo = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  protected readonly icons = {
    empty: faShoppingBag,
    image: faImage,
    minus: faMinus,
    plus: faPlus,
    remove: faTrashCan,
    retry: faRotate,
    warning: faTriangleExclamation
  };
  private readonly failedImageSources = signal<ReadonlySet<string>>(new Set());
  protected readonly shippingProgress = computed(() => {
    const subtotal = this.cart.subtotal();
    const settings = this.settings.settings();
    if (!subtotal || settings.freeShippingMinimumAmount <= 0 || settings.currencyCode !== subtotal.currency) {
      return null;
    }
    const remaining = Math.max(0, settings.freeShippingMinimumAmount - subtotal.amount);
    return {
      percent: Math.min(100, (subtotal.amount / settings.freeShippingMinimumAmount) * 100),
      remaining,
      currency: subtotal.currency
    };
  });
  @ViewChild('cartHeading') private cartHeading?: ElementRef<HTMLHeadingElement>;

  constructor() {
    effect(() => {
      const locale = this.locale.locale();
      this.seo.apply({
        title: this.locale.translate('cart.seoTitle'),
        description: this.locale.translate('cart.seoDescription'),
        path: `/${locale}/cart`,
        locale,
        robots: 'noindex,nofollow',
        alternatePaths: { ar: '/ar/cart', en: '/en/cart', xDefault: '/ar/cart' }
      });
    });
  }

  protected money(amount: number, currency: string): string {
    return formatMoney(amount, currency, this.locale.locale());
  }

  protected statusLabel(status: CartLineStatus): string {
    return this.locale.translate(statusKey(status));
  }

  protected imageAvailable(line: CartViewLine): boolean {
    return Boolean(line.imageUrl) && !this.failedImageSources().has(imageKey(line));
  }

  protected imageFailed(line: CartViewLine): void {
    this.failedImageSources.update((sources) => new Set(sources).add(imageKey(line)));
  }

  protected increment(line: CartViewLine): void {
    this.cart.increment(line);
    this.cart.store.announce(
      this.locale.interpolate('cart.quantityUpdated', {
        name: line.productName,
        count: Math.min(line.maximumQuantity, line.quantity + 1)
      })
    );
  }

  protected decrement(line: CartViewLine): void {
    this.cart.decrement(line);
    this.cart.store.announce(
      this.locale.interpolate('cart.quantityUpdated', {
        name: line.productName,
        count: Math.max(1, line.quantity - 1)
      })
    );
  }

  protected remove(line: CartViewLine, index: number): void {
    this.cart.remove(line.productId);
    this.cart.store.announce(this.locale.interpolate('cart.itemRemoved', { name: line.productName }));
    setTimeout(() => {
      const remaining = this.document.querySelectorAll<HTMLButtonElement>('[data-cart-remove]');
      remaining[Math.min(index, remaining.length - 1)]?.focus() ?? this.cartHeading?.nativeElement.focus();
    });
  }
}

function imageKey(line: CartViewLine): string {
  return `${line.productId}|${line.imageUrl}`;
}

function statusKey(status: CartLineStatus) {
  const keys = {
    valid: 'cart.status.valid',
    'price-changed': 'cart.status.price-changed',
    'out-of-stock': 'cart.status.out-of-stock',
    removed: 'cart.status.removed',
    'temporarily-unavailable': 'cart.status.temporarily-unavailable',
    invalid: 'cart.status.invalid'
  } as const;
  return keys[status];
}
