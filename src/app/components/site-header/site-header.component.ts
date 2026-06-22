import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { GeneralSettingsService } from '../../services/general-settings.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './site-header.component.html'
})
export class SiteHeaderComponent {
  protected readonly cart = inject(CartService);
  protected readonly generalSettings = inject(GeneralSettingsService);
  protected readonly drawerOpen = signal(false);
  protected readonly freeShippingTarget = computed(
    () => this.generalSettings.settings().freeShippingMinimumAmount
  );

  @Input() searchPlaceholder = 'بحث عن رقم قطعة غيار أو كلمات مفتاحية...';
  @Input() searchValue = '';
  @Input() showSearch = true;
  @Output() searchValueChange = new EventEmitter<string>();

  protected readonly remainingForFreeShipping = computed(() =>
    Math.max(0, this.freeShippingTarget() - this.cart.subtotal())
  );
  protected readonly freeShippingProgress = computed(() => {
    const target = this.freeShippingTarget();
    return target > 0 ? Math.min(100, (this.cart.subtotal() / target) * 100) : 0;
  });

  protected openDrawer() {
    this.drawerOpen.set(true);
  }

  protected closeDrawer() {
    this.drawerOpen.set(false);
  }

  protected updateSearch(value: string) {
    this.searchValueChange.emit(value);
  }
}
