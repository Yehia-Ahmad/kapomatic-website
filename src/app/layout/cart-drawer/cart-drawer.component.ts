import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  Renderer2,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faImage, faMinus, faPlus, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { CartFacade, CartLineStatus, CartViewLine } from '../../domains/cart/cart.facade';
import { formatMoney } from '../../shared/pricing/normalized-price';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [RouterLink, FaIconComponent],
  templateUrl: './cart-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartDrawerComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  protected readonly locale = inject(LocaleService);
  protected readonly cart = inject(CartFacade);
  protected readonly icons = {
    close: faXmark,
    image: faImage,
    minus: faMinus,
    plus: faPlus,
    remove: faTrashCan
  };
  private readonly failedImageSources = signal<ReadonlySet<string>>(new Set());
  private previousBodyOverflow = '';
  private skipLink: HTMLElement | null = null;
  private skipLinkWasInert = false;
  private skipLinkAriaHidden: string | null = null;

  @Output() readonly closeRequested = new EventEmitter<void>();
  @ViewChild('dialogPanel', { static: true }) private dialogPanel!: ElementRef<HTMLElement>;
  @ViewChild('closeButton', { static: true }) private closeButton!: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.skipLink = this.document.querySelector<HTMLElement>('.skip-link');
    if (this.skipLink) {
      this.skipLinkWasInert = this.skipLink.inert;
      this.skipLinkAriaHidden = this.skipLink.getAttribute('aria-hidden');
      this.renderer.setProperty(this.skipLink, 'inert', true);
      this.renderer.setAttribute(this.skipLink, 'aria-hidden', 'true');
    }
    this.closeButton.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.renderer.setStyle(this.document.body, 'overflow', this.previousBodyOverflow);
    if (this.skipLink) {
      this.renderer.setProperty(this.skipLink, 'inert', this.skipLinkWasInert);
      if (this.skipLinkAriaHidden === null) this.renderer.removeAttribute(this.skipLink, 'aria-hidden');
      else this.renderer.setAttribute(this.skipLink, 'aria-hidden', this.skipLinkAriaHidden);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeRequested.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.dialogPanel.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) event.preventDefault();
    else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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

  protected remove(line: CartViewLine): void {
    this.cart.remove(line.productId);
    this.cart.store.announce(this.locale.interpolate('cart.itemRemoved', { name: line.productName }));
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
