import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { CartService } from '../../services/cart.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './cart.page.html'
})
export class CartPage {
  protected readonly cart = inject(CartService);
  protected readonly shipping = computed(() => 0);
  protected readonly tax = computed(() => 0);
  protected readonly discount = computed(() => 0);

  protected readonly cartItems = this.cart.items;
  protected readonly currency = this.cart.currency;
  protected readonly subtotal = this.cart.subtotal;

  protected readonly total = computed(() => {
    const result = this.subtotal() + this.shipping() + this.tax() - this.discount();
    return Math.max(0, result);
  });

  protected setQty(itemId: string, qty: number) {
    this.cart.setQty(itemId, qty);
  }

  protected removeItem(itemId: string) {
    this.cart.remove(itemId);
  }
}
