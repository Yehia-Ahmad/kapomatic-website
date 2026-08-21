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
import { LocalizationService } from '../../services/localization.service';
import { LanguageCode, UrlService } from '../../services/url.service';

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
  protected readonly localization = inject(LocalizationService);
  protected readonly urls = inject(UrlService);

  protected readonly activeTab = signal<TabKey>('specs');
  protected readonly quantity = signal(1);
  protected readonly product = signal<EcommerceProduct | null>(null);
  protected readonly categoryId = signal('');
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeImageId = signal('');
  protected readonly categoryName = signal('');
  protected readonly language = signal<LanguageCode>('ar');

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
    this.language.set(this.localization.languageFromSnapshot(this.route.snapshot));
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (slug) {
      this.loadProductBySlug(slug);
      return;
    }

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
          this.seo.setProductPage(product, this.categoryName(), this.language());
          this.loading.set(false);
        },
        error: () => {
          this.product.set(null);
          this.loadError.set('تعذر تحميل بيانات المنتج حالياً.');
          this.loading.set(false);
        }
      });
  }

  private loadProductBySlug(slug: string) {
    this.loading.set(true);
    this.loadError.set('');

    this.ecommerceService
      .getPublicProductBySlug(this.language(), slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ product, seo }) => {
          this.product.set(product);
          this.categoryId.set(product.categoryId ?? '');
          this.categoryName.set(product.categoryTitle ?? '');
          this.activeImageId.set(product.images[0]?.id ?? '');
          const canonicalPath = this.urls.localizedProduct(this.language(), product.slug || slug);
          const arSlug = product.alternateSlugs?.ar;
          const enSlug = product.alternateSlugs?.en;
          const canonicalUrl = this.urls.absoluteUrl(canonicalPath);
          const price = this.seo.visibleProductPrice(product);
          this.seo.setPage(
            this.seo.fromBackend(seo ?? product.seo, {
              title: `${product.title} | ${this.language() === 'ar' ? 'كابوماتيك' : 'Kapomatic'}`,
              description: product.description || product.subTitle || product.title,
              canonicalUrl,
              language: this.language(),
              image: product.imageSrc,
              type: 'product',
              alternateUrls: {
                ar: arSlug ? this.urls.absoluteUrl(this.urls.localizedProduct('ar', arSlug)) : undefined,
                en: enSlug ? this.urls.absoluteUrl(this.urls.localizedProduct('en', enSlug)) : undefined,
                xDefault: arSlug ? this.urls.absoluteUrl(this.urls.localizedProduct('ar', arSlug)) : undefined
              },
              structuredData: [
                this.seo.breadcrumbStructuredData([
                  { name: this.language() === 'ar' ? 'الرئيسية' : 'Home', url: this.urls.localizedHome(this.language()) },
                  {
                    name: product.categoryTitle || (this.language() === 'ar' ? 'المنتجات' : 'Products'),
                    url: product.categorySlug
                      ? this.urls.localizedCategory(this.language(), product.categorySlug)
                      : this.urls.localizedSearch(this.language())
                  },
                  { name: product.title, url: canonicalPath }
                ]),
                this.seo.productStructuredData(product, product.categoryTitle, price, canonicalUrl)
              ]
            })
          );
          this.loading.set(false);
        },
        error: () => {
          this.product.set(null);
          this.loadError.set('تعذر تحميل بيانات المنتج حالياً.');
          this.seo.setNoIndexPage({
            title: this.language() === 'ar' ? 'المنتج غير موجود | كابوماتيك' : 'Product Not Found | Kapomatic',
            description: this.language() === 'ar' ? 'المنتج المطلوب غير متاح.' : 'The requested product is not available.',
            path: this.route.snapshot.url.map((part) => part.path).join('/'),
            language: this.language(),
            follow: false
          });
          this.loading.set(false);
        }
      });
  }
}
