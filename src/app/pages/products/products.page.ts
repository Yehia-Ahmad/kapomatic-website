import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import {
  CategoryFilter,
  EcommerceCategory,
  EcommerceProduct,
  EcommerceService,
  SpecificationFilter
} from '../../services/ecommerce.service';
import { WebsiteImagesService } from '../../services/website-images.service';
import { GeneralSettingsService } from '../../services/general-settings.service';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './products.page.html'
})
export class ProductsPage {
  private readonly ecommerceService = inject(EcommerceService);
  private readonly websiteImagesService = inject(WebsiteImagesService);
  protected readonly generalSettings = inject(GeneralSettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sortOptions: SelectOption<SortKey>[] = [
    { label: 'الأكثر صلة', value: 'relevance' },
    { label: 'السعر: من الأقل للأعلى', value: 'price_asc' },
    { label: 'السعر: من الأعلى للأقل', value: 'price_desc' },
    { label: 'التقييم: الأعلى', value: 'rating_desc' }
  ];

  protected readonly categories = signal<EcommerceCategory[]>([]);
  protected readonly selectedCategoryId = signal('');
  protected readonly products = signal<EcommerceProduct[]>([]);
  protected readonly specificationOptions = signal<CategoryFilter[]>([]);
  protected readonly loading = signal(true);
  protected readonly productsLoading = signal(false);
  protected readonly filtersLoading = signal(false);
  protected readonly loadError = signal('');
  protected readonly websiteImageId = signal('');
  protected readonly targetedTitle = signal('');
  protected readonly isTargetedListing = computed(() => Boolean(this.websiteImageId()));

  protected readonly selectedSpecs = signal<Record<string, string[]>>({});
  protected readonly query = signal('');
  protected readonly sort = signal<SortKey>('relevance');
  protected readonly pageSize = signal(12);
  protected readonly page = signal(1);
  protected readonly favorites = signal<Record<string, boolean>>({});

  protected readonly selectedCategory = computed<EcommerceCategory | undefined>(
    () => this.categories().find((category) => category.id === this.selectedCategoryId()) ?? this.categories()[0]
  );

  protected readonly selectedSpecificationPairs = computed<SpecificationFilter[]>(() =>
    Object.entries(this.selectedSpecs()).flatMap(([specification, values]) =>
      values.map((value) => ({ specification, value }))
    )
  );

  protected readonly results = computed(() => {
    const normalizedQuery = this.query().trim().toLowerCase();
    const filtered = this.products().filter((product) => {
      if (!normalizedQuery) return true;
      return [product.title, product.subTitle, product.brand]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    return [...filtered].sort((a, b) => {
      switch (this.sort()) {
        case 'price_asc':
          return this.displayPrice(a) - this.displayPrice(b);
        case 'price_desc':
          return this.displayPrice(b) - this.displayPrice(a);
        case 'rating_desc':
          return b.rating - a.rating;
        case 'relevance':
        default:
          return b.reviewsCount - a.reviewsCount;
      }
    });
  });

  private displayPrice(product: EcommerceProduct): number {
    return product.hasDiscount ? product.priceAfterDiscount! : product.retailPrice;
  }

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.results().length / this.pageSize())));
  protected readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));
  protected readonly pagedResults = computed(() => {
    const page = Math.min(Math.max(1, this.page()), this.totalPages());
    const startIndex = (page - 1) * this.pageSize();
    return this.results().slice(startIndex, startIndex + this.pageSize());
  });

  protected readonly resultsLabel = computed(() => {
    const total = this.results().length;
    const categoryTitle = this.isTargetedListing()
      ? this.targetedTitle() || 'المنتجات المرتبطة'
      : this.selectedCategory()?.title ?? 'المنتجات';
    return `${total} منتج في ${categoryTitle}`;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const websiteImageId = params.get('websiteImageId') ?? '';
      if (websiteImageId) {
        this.websiteImageId.set(websiteImageId);
        this.targetedTitle.set(params.get('targetTitle') ?? '');
        this.selectedSpecs.set({});
        this.specificationOptions.set([]);
        this.page.set(1);
        this.loadTargetedProducts(websiteImageId);
        return;
      }

      const wasTargeted = this.isTargetedListing();
      this.websiteImageId.set('');
      this.targetedTitle.set('');
      const categoryId = params.get('categoryId') ?? '';
      if (categoryId && (wasTargeted || categoryId !== this.selectedCategoryId())) {
        this.selectedCategoryId.set(categoryId);
        this.selectedSpecs.set({});
        this.loadCategoryFilters(categoryId);
        this.loadProducts(categoryId);
      }
    });

    this.loadCategories();
  }

  protected selectCategory(categoryId: string) {
    this.page.set(1);
    this.selectedSpecs.set({});
    this.selectedCategoryId.set(categoryId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { categoryId, websiteImageId: null, targetTitle: null },
      queryParamsHandling: 'merge'
    });
    this.loadCategoryFilters(categoryId);
    this.loadProducts(categoryId);
  }

  protected toggleSpecification(specification: string, value: string) {
    this.page.set(1);
    this.selectedSpecs.update((previous) => {
      const current = previous[specification] ?? [];
      const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];
      const updated = { ...previous, [specification]: next };
      if (next.length === 0) delete updated[specification];
      return updated;
    });
    this.loadProducts(this.selectedCategoryId());
  }

  protected clearFilters() {
    this.page.set(1);
    this.selectedSpecs.set({});
    this.query.set('');
    this.sort.set('relevance');
    if (!this.isTargetedListing()) this.loadProducts(this.selectedCategoryId());
  }

  protected isSpecificationSelected(specification: string, value: string) {
    return this.selectedSpecs()[specification]?.includes(value) ?? false;
  }

  protected isFavorite(productId: string) {
    return Boolean(this.favorites()[productId]);
  }

  protected toggleFavorite(productId: string) {
    this.favorites.update((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  protected updateQuery(value: string) {
    this.query.set(value);
    this.page.set(1);
  }

  protected goToPage(page: number) {
    const nextPage = Math.min(Math.max(1, page), this.totalPages());
    this.page.set(nextPage);
  }

  protected starsArray(rating: number) {
    const fullStars = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < fullStars);
  }

  private loadCategories() {
    this.loading.set(!this.isTargetedListing());
    this.ecommerceService
      .getActiveCategoriesWithProductsAndSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          const requestedCategory = this.selectedCategoryId();
          const categoryId =
            categories.find((category) => category.id === requestedCategory)?.id ?? categories[0]?.id ?? '';

          this.selectedCategoryId.set(categoryId);
          this.loading.set(false);

          if (this.isTargetedListing()) {
            return;
          } else if (categoryId) {
            this.loadCategoryFilters(categoryId);
            this.loadProducts(categoryId);
          } else {
            this.products.set([]);
            this.specificationOptions.set([]);
          }
        },
        error: () => {
          if (!this.isTargetedListing()) {
            this.loadError.set('تعذر تحميل الأقسام والمنتجات حالياً.');
          }
          this.loading.set(false);
          if (!this.isTargetedListing()) this.products.set([]);
        }
      });
  }

  private loadTargetedProducts(websiteImageId: string) {
    this.loading.set(false);
    this.loadError.set('');
    this.productsLoading.set(true);
    this.websiteImagesService
      .getProducts(websiteImageId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          if (this.websiteImageId() !== websiteImageId) return;
          this.products.set(products);
          this.productsLoading.set(false);
        },
        error: () => {
          if (this.websiteImageId() !== websiteImageId) return;
          this.products.set([]);
          this.productsLoading.set(false);
          this.loadError.set('تعذر تحميل المنتجات المرتبطة بهذا العرض حالياً.');
        }
      });
  }

  private loadProducts(categoryId: string) {
    if (!categoryId) return;

    this.productsLoading.set(true);
    this.ecommerceService
      .getProductsByActiveCategory(categoryId, this.selectedSpecificationPairs())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.productsLoading.set(false);
        },
        error: () => {
          const embeddedProducts = this.categories().find((category) => category.id === categoryId)?.products ?? [];
          this.products.set(embeddedProducts);
          this.productsLoading.set(false);
        }
      });
  }

  private loadCategoryFilters(categoryId: string) {
    if (!categoryId) return;

    this.filtersLoading.set(true);
    this.ecommerceService
      .getCategoryFilters(categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ filters, products }) => {
          this.specificationOptions.set(filters.filter((filter) => filter.isVisible));
          if (products.length > 0 && this.selectedSpecificationPairs().length === 0) {
            this.products.set(products);
          }
          this.filtersLoading.set(false);
        },
        error: () => {
          this.specificationOptions.set([]);
          this.filtersLoading.set(false);
        }
      });
  }
}
