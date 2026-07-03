import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { CartService } from '../../services/cart.service';
import { EcommerceProduct, EcommerceService } from '../../services/ecommerce.service';
import { GeneralSettingsService } from '../../services/general-settings.service';
import { SeoService } from '../../services/seo.service';

type TabKey = 'specs' | 'reviews' | 'fitment';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './product-detail.page.html'
})
export class ProductDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly ecommerceService = inject(EcommerceService);
  private readonly cart = inject(CartService);
  protected readonly generalSettings = inject(GeneralSettingsService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<TabKey>('specs');
  protected readonly quantity = signal(1);
  protected readonly product = signal<EcommerceProduct | null>(null);
  protected readonly categoryId = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeImageId = signal('');
  protected readonly categoryName = signal('');

  protected readonly activeImage = computed(() => {
    const product = this.product();
    if (!product) return null;
    return product.images.find((img) => img.id === this.activeImageId()) ?? product.images[0] ?? null;
  });

  constructor() {
    this.seo.setDefaultPage();

    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProductFromRoute());
  }

  protected setTab(key: TabKey) {
    this.activeTab.set(key);
  }

  protected setActiveImage(imageId: string) {
    this.activeImageId.set(imageId);
  }

  protected incrementQty() {
    this.quantity.update((q) => Math.min(99, q + 1));
  }

  protected decrementQty() {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  protected addToCart(product: EcommerceProduct) {
    this.cart.addProduct(product, this.quantity());
  }

  protected starsArray(rating: number) {
    const fullStars = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < fullStars);
  }

  private loadProductFromRoute() {
    const productId = this.route.snapshot.paramMap.get('id') ?? '';
    const categoryId = this.route.snapshot.queryParamMap.get('categoryId') ?? this.categoryId();

    if (!productId) {
      this.loadError.set('لم يتم تحديد المنتج.');
      this.loading.set(false);
      return;
    }

    if (categoryId) {
      this.categoryId.set(categoryId);
      this.loadProduct(categoryId, productId);
      return;
    }

    this.loading.set(true);
    this.ecommerceService
      .getActiveCategoriesWithProductsAndSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          const category = categories.find((entry) => entry.products.some((product) => product.id === productId));
          const resolvedCategoryId = category?.id ?? '';
          if (!resolvedCategoryId) {
            this.loadError.set('تعذر تحديد القسم الخاص بهذا المنتج.');
            this.loading.set(false);
            return;
          }

          this.categoryId.set(resolvedCategoryId);
          this.categoryName.set(category?.title ?? '');
          this.loadProduct(resolvedCategoryId, productId);
        },
        error: () => {
          this.loadError.set('تعذر تحميل بيانات المنتج حالياً.');
          this.loading.set(false);
        }
      });
  }

  private loadProduct(categoryId: string, productId: string) {
    this.loading.set(true);
    this.loadError.set('');

    this.ecommerceService
      .getProductByActiveCategory(categoryId, productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.product.set(product);
          this.activeImageId.set(product.images[0]?.id ?? '');
          this.seo.setProductPage(product, this.categoryName());
          this.loading.set(false);
        },
        error: () => {
          this.product.set(null);
          this.loadError.set('تعذر تحميل بيانات المنتج حالياً.');
          this.loading.set(false);
        }
      });
  }
}
