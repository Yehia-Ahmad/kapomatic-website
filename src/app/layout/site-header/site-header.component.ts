import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars,
  faBagShopping,
  faLanguage,
  faMagnifyingGlass,
  faPhone,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../core/security/public-url.utils';
import { CartStore } from '../../domains/cart/cart.store';
import { HeaderConfig, HeaderNavigationItem } from '../../domains/header/header.models';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [FaIconComponent, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteHeaderComponent {
  private readonly router = inject(Router);
  protected readonly locale = inject(LocaleService);
  protected readonly cart = inject(CartStore);

  @Input({ required: true }) config!: HeaderConfig;
  @Input({ required: true }) navigation: readonly HeaderNavigationItem[] = [];
  @Input() logoUrl = '';
  @Input() mobileLogoUrl = '';
  @Input() whatsappHref = '';
  @Input() cartDrawerOpen = false;
  @Output() readonly menuRequested = new EventEmitter<void>();
  @Output() readonly cartRequested = new EventEmitter<void>();
  @ViewChild('menuButton') private menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('cartButton') private cartButton?: ElementRef<HTMLButtonElement>;

  protected searchQuery = '';
  protected readonly icons = {
    bars: faBars,
    cart: faBagShopping,
    language: faLanguage,
    search: faMagnifyingGlass,
    whatsapp: faWhatsapp,
    phone: faPhone,
    chevron: faChevronDown
  };
  protected readonly cartLabel = computed(() =>
    this.locale.interpolate('header.cartCount', { count: this.cart.count() })
  );

  protected submitSearch(): void {
    const query = this.searchQuery.trim().replace(/\s+/g, ' ');
    if (!query) return;
    void this.router.navigate(['/', this.locale.locale(), 'search'], {
      queryParams: { q: query }
    });
  }

  protected localizedUrl(item: HeaderNavigationItem): string {
    return localizedInternalUrl(item.url, this.locale.locale());
  }

  protected switchLocale(): void {
    void this.locale.switchLocale(this.locale.locale() === 'ar' ? 'en' : 'ar');
  }

  focusMenuButton(): void {
    this.menuButton?.nativeElement.focus();
  }

  focusCartButton(): void {
    this.cartButton?.nativeElement.focus();
  }
}
