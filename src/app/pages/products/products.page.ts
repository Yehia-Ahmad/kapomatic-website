import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import {
  CategoryFilter,
  EcommerceCategory,
  EcommerceProduct,
  EcommerceService,
  ProductPagination,
  ProductSortKey,
  SpecificationFilter
} from '../../services/ecommerce.service';
import { WebsiteImagesService } from '../../services/website-images.service';
import { GeneralSettingsService } from '../../services/general-settings.service';
import { CartService } from '../../services/cart.service';
import { SeoService } from '../../services/seo.service';
import { LocalizationService } from '../../services/localization.service';
import { LanguageCode, UrlService } from '../../services/url.service';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type SortKey = ProductSortKey;

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './products.page.html'
})
export class ProductsPage {
  private readonly ecommerceService = inject(EcommerceService);
  private readonly websiteImagesService = inject(WebsiteImagesService);
  protected readonly cart = inject(CartService);
  protected readonly generalSettings = inject(GeneralSettingsService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly localization = inject(LocalizationService);
  protected readonly urls = inject(UrlService);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly sortOptions: SelectOption<SortKey>[] = [
    { label: 'التقييم: الأعلى', value: 'rating_desc' },
    { label: 'السعر: من الأقل للأعلى', value: 'price_asc' },
    { label: 'السعر: من الأعلى للأقل', value: 'price_desc' },
  ];

  protected readonly categories = signal<EcommerceCategory[]>([]);
  protected readonly selectedCategoryId = signal('');
  protected readonly products = signal<EcommerceProduct[]>([]);
  protected readonly specificationOptions = signal<CategoryFilter[]>([]);
  protected readonly loading = signal(true);
  protected readonly productsLoading = signal(false);
  protected readonly nextPageLoading = signal(false);
  protected readonly filtersLoading = signal(false);
  protected readonly loadError = signal('');
  protected readonly websiteImageId = signal('');
  protected readonly targetedTitle = signal('');
  protected readonly language = signal<LanguageCode>('ar');
  protected readonly selectedCategorySlug = signal('');
  protected readonly isTargetedListing = computed(() => Boolean(this.websiteImageId()));
  protected readonly isSearchListing = computed(() => Boolean(this.query().trim()));

  protected readonly selectedSpecs = signal<Record<string, string[]>>({});
  protected readonly query = signal('');
  protected readonly sort = signal<SortKey>('relevance');
  protected readonly pageSize = signal(12);
  protected readonly productPagination = signal<ProductPagination | null>(null);
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
    const filtered = this.isSearchListing()
      ? this.products()
      : this.products().filter((product) => {
          if (!normalizedQuery) return true;
          return [product.title, product.subTitle, product.brand]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedQuery));
        });

    if (this.sort() === 'relevance') return filtered;
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

  protected readonly visibleResults = computed(() => this.results());
  protected readonly hasNextProductPage = computed(
    () => (this.isSearchListing() || !this.isTargetedListing()) && Boolean(this.productPagination()?.hasNextPage)
  );

  protected readonly resultsLabel = computed(() => {
    const total = this.productPagination()?.totalItems ?? this.results().length;
    if (this.isSearchListing()) return `${total} نتيجة بحث عن "${this.query().trim()}"`;

    const categoryTitle = this.isTargetedListing()
      ? this.targetedTitle() || 'المنتجات المرتبطة'
      : this.selectedCategory()?.title ?? 'المنتجات';
    return `${total} منتج في ${categoryTitle}`;
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([routeParams, queryParams]) => {
      const language = this.localization.languageFromSnapshot(this.route.snapshot);
      this.language.set(language);
      const slug = routeParams.get('slug') ?? '';
      const isCategoryRoute = this.router.url.split('?')[0].includes(`/${language}/categories/`);
      const isSearchRoute = this.router.url.split('?')[0] === `/${language}/search`;
      const websiteImageId = queryParams.get('websiteImageId') ?? '';
      if (websiteImageId) {
        this.websiteImageId.set(websiteImageId);
        this.query.set('');
        this.targetedTitle.set(queryParams.get('targetTitle') ?? '');
        this.selectedSpecs.set({});
        this.specificationOptions.set([]);
        this.productPagination.set(null);
        this.updateSeo();
        this.loadTargetedProducts(websiteImageId);
        return;
      }

      const wasTargeted = this.isTargetedListing();
      this.websiteImageId.set('');
      this.targetedTitle.set('');

      const search = (queryParams.get('q') ?? queryParams.get('search') ?? '').trim();
      if (isSearchRoute || search) {
        this.query.set(search);
        this.selectedSpecs.set({});
        this.specificationOptions.set([]);
        this.productPagination.set(null);
        this.updateSeo();
        this.loadSearchProducts(search);
        return;
      }

      const wasSearch = this.isSearchListing();
      this.query.set('');
      if (isCategoryRoute && slug) {
        this.selectedCategorySlug.set(slug);
        this.selectedSpecs.set({});
        this.loadPublicCategory(slug);
        return;
      }

      const categoryId = queryParams.get('categoryId') ?? '';
      if (categoryId && (wasTargeted || wasSearch || categoryId !== this.selectedCategoryId())) {
        this.selectedCategoryId.set(categoryId);
        this.selectedCategorySlug.set('');
        this.selectedSpecs.set({});
        this.loadCategoryFilters(categoryId);
        this.loadProducts(categoryId);
        this.updateSeo();
      } else if (wasSearch && this.selectedCategoryId()) {
        this.loadProducts(this.selectedCategoryId());
        this.updateSeo();
      }
    });

    this.loadCategories();
    this.updateSeo();
  }

  protected selectCategory(categoryId: string) {
    this.selectedSpecs.set({});
    this.selectedCategoryId.set(categoryId);
    const category = this.categories().find((entry) => entry.id === categoryId);
    this.router.navigate([this.categoryLink(category ?? { id: categoryId, title: '', subtitle: '', imageSrc: '', products: [] })]);
    this.updateSeo();
    this.loadCategoryFilters(categoryId);
    this.loadProducts(categoryId);
  }

  protected toggleSpecification(specification: string, value: string) {
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

  protected addToCart(product: EcommerceProduct) {
    if (!product.inStock) return;
    this.cart.addProduct(product);
  }

  protected updateQuery(value: string) {
    this.query.set(value);
    this.updateSeo();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);

    const term = value.trim();
    this.searchDebounce = setTimeout(() => {
      if (term) {
        this.router.navigate([this.urls.localizedSearch(this.language())], { queryParams: { q: term } });
        this.loadSearchProducts(term);
        return;
      }

      this.router.navigate([this.urls.localizedHome(this.language())]);

      if (this.isTargetedListing()) {
        this.loadTargetedProducts(this.websiteImageId());
      } else {
        this.loadProducts(this.selectedCategoryId());
      }
    }, 300);
  }

  protected updateSort(value: SortKey) {
    this.sort.set(value);
    if (this.isSearchListing()) return;
    if (!this.isTargetedListing()) this.loadProducts(this.selectedCategoryId());
  }

  @HostListener('window:scroll')
  protected onWindowScroll() {
    this.loadNextProductsPageIfNeeded();
  }

  protected starsArray(rating: number) {
    const fullStars = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < fullStars);
  }

  protected categoryLink(category: EcommerceCategory): string {
    return this.urls.localizedCategory(this.language(), category.slug || category.id);
  }

  protected productLink(product: EcommerceProduct): string {
    return this.urls.localizedProduct(this.language(), product.slug || product.id);
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
          this.updateSeo();

          if (this.isTargetedListing() || this.selectedCategorySlug()) {
            return;
          } else if (categoryId) {
            this.loadCategoryFilters(categoryId);
            this.loadProducts(categoryId);
          } else {
            this.products.set([]);
            this.productPagination.set(null);
            this.specificationOptions.set([]);
          }
        },
        error: () => {
          if (!this.isTargetedListing()) {
            this.loadError.set('تعذر تحميل الأقسام والمنتجات حالياً.');
          }
          this.loading.set(false);
          if (!this.isTargetedListing()) {
            this.products.set([]);
            this.productPagination.set(null);
          }
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
          this.productPagination.set(null);
          this.productsLoading.set(false);
          this.updateSeo();
        },
        error: () => {
          if (this.websiteImageId() !== websiteImageId) return;
          this.products.set([]);
          this.productPagination.set(null);
          this.productsLoading.set(false);
          this.loadError.set('تعذر تحميل المنتجات المرتبطة بهذا العرض حالياً.');
        }
      });
  }

  private loadPublicCategory(slug: string) {
    this.loading.set(false);
    this.productsLoading.set(true);
    this.loadError.set('');

    this.ecommerceService
      .getPublicCategoryBySlug(this.language(), slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ category }) => {
          if (this.selectedCategorySlug() !== slug) return;
          this.categories.update((current) => {
            const withoutCurrent = current.filter((entry) => entry.id !== category.id);
            return [category, ...withoutCurrent];
          });
          this.selectedCategoryId.set(category.id);
          this.loadCategoryFilters(category.id);
          this.loadProducts(category.id);
        },
        error: () => {
          if (this.selectedCategorySlug() !== slug) return;
          this.products.set([]);
          this.productPagination.set(null);
          this.productsLoading.set(false);
          this.loadError.set('تعذر تحميل القسم حالياً.');
          this.seo.setNoIndexPage({
            title: this.language() === 'ar' ? 'القسم غير موجود | كابوماتيك' : 'Category Not Found | Kapomatic',
            description: this.language() === 'ar' ? 'القسم المطلوب غير متاح.' : 'The requested category is not available.',
            path: this.router.url.split('?')[0],
            language: this.language(),
            follow: false
          });
        }
      });
  }

  private loadProducts(categoryId: string, page = 1) {
    if (!categoryId) return;

    const requestedSort = this.sort();
    const requestedQuery = this.query().trim();
    const isFirstPage = page === 1;
    if (isFirstPage) {
      this.productsLoading.set(true);
      this.nextPageLoading.set(false);
      this.productPagination.set(null);
    } else {
      this.nextPageLoading.set(true);
    }

    const request = this.selectedCategorySlug()
      ? this.ecommerceService.getPublicCategoryProductsBySlug(
          this.language(),
          this.selectedCategorySlug(),
          this.selectedSpecificationPairs(),
          page,
          this.pageSize(),
          requestedSort
        )
      : this.ecommerceService.getProductsByActiveCategoryPage(
          categoryId,
          this.selectedSpecificationPairs(),
          page,
          this.pageSize(),
          requestedSort
        );

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ products, pagination }) => {
          if (
            this.selectedCategoryId() !== categoryId ||
            this.sort() !== requestedSort ||
            this.query().trim() !== requestedQuery ||
            this.isTargetedListing()
          ) {
            return;
          }
          this.productPagination.set(pagination);
          this.products.update((current) => (isFirstPage ? products : this.uniqueProducts([...current, ...products])));
          this.productsLoading.set(false);
          this.nextPageLoading.set(false);
          if (isFirstPage) this.updateSeo();
          setTimeout(() => this.loadNextProductsPageIfNeeded());
        },
        error: () => {
          const embeddedProducts = this.categories().find((category) => category.id === categoryId)?.products ?? [];
          if (isFirstPage) this.products.set(embeddedProducts);
          this.productPagination.set(null);
          this.productsLoading.set(false);
          this.nextPageLoading.set(false);
        }
      });
  }

  private loadSearchProducts(q: string, page = 1) {
    const requestedQuery = q.trim();
    if (!requestedQuery) {
      this.products.set([]);
      this.productPagination.set(null);
      this.productsLoading.set(false);
      this.nextPageLoading.set(false);
      this.updateSeo();
      return;
    }

    const isFirstPage = page === 1;
    if (isFirstPage) {
      this.productsLoading.set(true);
      this.nextPageLoading.set(false);
      this.productPagination.set(null);
    } else {
      this.nextPageLoading.set(true);
    }

    this.ecommerceService
      .searchPublicProducts(this.language(), requestedQuery, page, this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ products, pagination }) => {
          if (this.query().trim() !== requestedQuery) return;
          this.productPagination.set(pagination);
          this.products.update((current) => (isFirstPage ? products : this.uniqueProducts([...current, ...products])));
          this.productsLoading.set(false);
          this.nextPageLoading.set(false);
          if (isFirstPage) this.updateSeo();
          setTimeout(() => this.loadNextProductsPageIfNeeded());
        },
        error: () => {
          if (this.query().trim() !== requestedQuery) return;
          if (isFirstPage) this.products.set([]);
          this.productPagination.set(null);
          this.productsLoading.set(false);
          this.nextPageLoading.set(false);
        }
      });
  }

  private loadNextProductsPageIfNeeded() {
    if (
      (!this.isSearchListing() && this.isTargetedListing()) ||
      this.productsLoading() ||
      this.nextPageLoading() ||
      !this.hasNextProductPage()
    ) {
      return;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const documentElement = document.documentElement;
    const distanceToBottom = documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    if (distanceToBottom > 500) return;

    const nextPage = (this.productPagination()?.page ?? 1) + 1;
    if (this.isSearchListing()) {
      this.loadSearchProducts(this.query(), nextPage);
      return;
    }

    this.loadProducts(this.selectedCategoryId(), nextPage);
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
          if (products.length > 0 && this.selectedSpecificationPairs().length === 0 && this.products().length === 0) {
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

  private uniqueProducts(products: EcommerceProduct[]): EcommerceProduct[] {
    const unique = new Map<string, EcommerceProduct>();
    for (const product of products) {
      if (product.id && !unique.has(product.id)) unique.set(product.id, product);
    }
    return Array.from(unique.values());
  }

  private updateSeo() {
    const category = this.selectedCategory();
    const categorySlug = this.selectedCategorySlug() || category?.slug;
    const canonicalPath = categorySlug ? this.urls.localizedCategory(this.language(), categorySlug) : this.router.url;
    const alternates = category?.alternateSlugs
      ? {
          ar: category.alternateSlugs.ar
            ? this.urls.absoluteUrl(this.urls.localizedCategory('ar', category.alternateSlugs.ar))
            : undefined,
          en: category.alternateSlugs.en
            ? this.urls.absoluteUrl(this.urls.localizedCategory('en', category.alternateSlugs.en))
            : undefined,
          xDefault: category.alternateSlugs.ar
            ? this.urls.absoluteUrl(this.urls.localizedCategory('ar', category.alternateSlugs.ar))
            : undefined
        }
      : undefined;

    if (categorySlug && !this.isSearchListing() && !this.isTargetedListing()) {
      this.seo.setPage(
        this.seo.fromBackend(category?.seo, {
          title: category?.title ? `${category.title} | كابوماتيك` : 'كابوماتيك',
          description: category?.description || category?.subtitle || 'منتجات كابوماتيك.',
          canonicalUrl: this.urls.absoluteUrl(canonicalPath),
          language: this.language(),
          robots: this.selectedSpecificationPairs().length > 0 || this.sort() !== 'relevance' ? 'noindex,follow' : 'index,follow',
          image: category?.imageSrc,
          alternateUrls: alternates,
          structuredData: [
            this.seo.breadcrumbStructuredData([
              { name: this.language() === 'ar' ? 'الرئيسية' : 'Home', url: this.urls.localizedHome(this.language()) },
              { name: category?.title || 'Category', url: canonicalPath }
            ]),
            this.seo.itemListStructuredData(this.products(), this.language())
          ]
        })
      );
      return;
    }

    this.seo.setProductsPage({
      categoryName: this.isSearchListing() || this.isTargetedListing() ? undefined : this.selectedCategory()?.title,
      categoryId: this.isSearchListing() || this.isTargetedListing() ? undefined : this.selectedCategoryId(),
      categorySlug: this.isSearchListing() || this.isTargetedListing() ? undefined : this.selectedCategorySlug(),
      searchQuery: this.query(),
      targetedTitle: this.isTargetedListing() ? this.targetedTitle() : undefined,
      language: this.language(),
      filtersActive: this.selectedSpecificationPairs().length > 0 || this.sort() !== 'relevance'
    });
  }
}
