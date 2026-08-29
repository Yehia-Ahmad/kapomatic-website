import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faFilter,
  faRotate,
  faTriangleExclamation,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { SupportedLocale } from '../../core/http/api-endpoints';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { SsrResponseService } from '../../core/ssr/ssr-response.service';
import { filterQueryKey, filterTitleFromQueryKey } from '../../domains/catalog/catalog.normalizer';
import {
  CatalogCategory,
  CatalogContractError,
  CatalogFilterGroup,
  CatalogPagination,
  CatalogProduct,
  CategoryQueryState
} from '../../domains/catalog/catalog.models';
import { CatalogRepository } from '../../domains/catalog/catalog.repository';
import { CatalogProductCardComponent } from './components/catalog-product-card.component';
import { CategoryFilterDrawerComponent } from './components/category-filter-drawer.component';

type CategoryStatus =
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'empty'
  | 'error'
  | 'malformed'
  | 'missing'
  | 'pagination-error';

interface CategoryRequest {
  readonly locale: SupportedLocale;
  readonly slug: string;
  readonly query: CategoryQueryState;
}

type CategoryLoadResult =
  | {
      readonly kind: 'loaded';
      readonly request: CategoryRequest;
      readonly category: CatalogCategory;
      readonly products: readonly CatalogProduct[];
      readonly pagination: CatalogPagination;
      readonly filters: readonly CatalogFilterGroup[];
      readonly filtersFailed: boolean;
    }
  | { readonly kind: 'redirect'; readonly location: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'error'; readonly error: unknown };

@Component({
  standalone: true,
  imports: [RouterLink, FaIconComponent, CatalogProductCardComponent, CategoryFilterDrawerComponent],
  templateUrl: './category.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryPageComponent {
  protected readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(CatalogRepository);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly seo = inject(SeoService);
  private readonly ssrResponse = inject(SsrResponseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly retryRequest = new Subject<void>();

  protected readonly status = signal<CategoryStatus>('loading');
  protected readonly category = signal<CatalogCategory | null>(null);
  protected readonly products = signal<readonly CatalogProduct[]>([]);
  protected readonly pagination = signal<CatalogPagination | null>(null);
  protected readonly filterGroups = signal<readonly CatalogFilterGroup[]>([]);
  protected readonly filtersFailed = signal(false);
  protected readonly activeQuery = signal<CategoryQueryState>(emptyQuery());
  protected readonly drawerOpen = signal(false);
  protected readonly icons = {
    filter: faFilter,
    previous: faChevronLeft,
    next: faChevronRight,
    retry: faRotate,
    warning: faTriangleExclamation,
    remove: faXmark
  };
  protected readonly hasFilters = computed(() => Object.keys(this.activeQuery().filters).length > 0);
  protected readonly activeFilters = computed(() =>
    Object.entries(this.activeQuery().filters).map(([id, value]) => ({
      id,
      title: this.filterGroups().find((group) => group.id === id)?.title || filterTitleFromQueryKey(id),
      value
    }))
  );
  @ViewChild('filterTrigger') private filterTrigger?: ElementRef<HTMLButtonElement>;

  constructor() {
    combineLatest([
      combineLatest([this.route.paramMap, this.route.queryParamMap, toObservable(this.locale.locale)]).pipe(
        map(([params, queryParams, locale]) => requestFromRoute(params, queryParams, locale)),
        distinctUntilChanged((left, right) => JSON.stringify(left) === JSON.stringify(right))
      ),
      this.retryRequest.pipe(startWith(undefined))
    ])
      .pipe(
        map(([request]) => request),
        tap((request) => {
          this.activeQuery.set(request.query);
          this.status.set(this.category() ? 'refreshing' : 'loading');
        }),
        switchMap((request) => this.load(request)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => this.applyResult(result));
  }

  protected selectSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const sort = value === 'price_asc' || value === 'price_desc' ? value : 'latest';
    this.navigate({ ...this.activeQuery(), page: 1, sort });
  }

  protected toggleFilter(groupId: string, value: string): void {
    const filters = { ...this.activeQuery().filters };
    if (filters[groupId] === value) delete filters[groupId];
    else filters[groupId] = value;
    this.navigate({ ...this.activeQuery(), page: 1, filters });
  }

  protected removeFilter(groupId: string): void {
    const filters = { ...this.activeQuery().filters };
    delete filters[groupId];
    this.navigate({ ...this.activeQuery(), page: 1, filters });
  }

  protected clearFilters(): void {
    this.navigate({ ...this.activeQuery(), page: 1, filters: {} });
  }

  protected applyDrawer(filters: Readonly<Record<string, string>>): void {
    this.drawerOpen.set(false);
    this.navigate({ ...this.activeQuery(), page: 1, filters });
    queueMicrotask(() => this.filterTrigger?.nativeElement.focus());
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    queueMicrotask(() => this.filterTrigger?.nativeElement.focus());
  }

  protected goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination || page < 1 || page > pagination.totalPages) return;
    this.navigate({ ...this.activeQuery(), page });
  }

  protected retry(): void {
    this.retryRequest.next();
  }

  protected selected(groupId: string, value: string): boolean {
    return this.activeQuery().filters[groupId] === value;
  }

  private load(request: CategoryRequest): Observable<CategoryLoadResult> {
    return this.repository.loadCategory(request.locale, request.slug).pipe(
      switchMap((category) =>
        forkJoin({
          listing: this.repository.loadCategoryProducts(request.locale, request.slug, request.query),
          filters: this.repository.loadFilterGroups(category.id).pipe(
            map((groups) => ({ groups, failed: false })),
            catchError(() => of({ groups: [] as readonly CatalogFilterGroup[], failed: true }))
          )
        }).pipe(
          map(({ listing, filters }) => ({
            kind: 'loaded' as const,
            request,
            category,
            products: listing.products,
            pagination: listing.pagination,
            filters: filters.groups,
            filtersFailed: filters.failed
          }))
        )
      ),
      catchError((error: unknown) => this.resolveLoadError(request, error))
    );
  }

  private resolveLoadError(request: CategoryRequest, error: unknown): Observable<CategoryLoadResult> {
    if (error instanceof CatalogContractError) return of({ kind: 'malformed' });
    if (!(error instanceof ApiError) || error.status !== 404) return of({ kind: 'error', error });
    return this.repository.resolveAlias(request.locale, 'category', request.slug).pipe(
      map((alias) => ({ kind: 'redirect' as const, location: alias.location })),
      catchError(() => of({ kind: 'missing' as const }))
    );
  }

  private applyResult(result: CategoryLoadResult): void {
    if (result.kind === 'redirect') {
      this.ssrResponse.redirect(result.location);
      if (this.isBrowser) void this.router.navigateByUrl(result.location, { replaceUrl: true });
      return;
    }
    if (result.kind === 'missing') {
      this.status.set('missing');
      this.ssrResponse.notFound();
      this.applyFallbackSeo('missing');
      return;
    }
    if (result.kind === 'malformed') {
      this.status.set('malformed');
      this.applyFallbackSeo('malformed');
      return;
    }
    if (result.kind === 'error') {
      this.status.set(this.category() && this.activeQuery().page > 1 ? 'pagination-error' : 'error');
      this.applyFallbackSeo('error');
      return;
    }
    if (result.category.slug !== result.request.slug) {
      const location = `/${result.request.locale}/categories/${encodeURIComponent(result.category.slug)}`;
      this.ssrResponse.redirect(location);
      if (this.isBrowser) {
        const queryParams = this.router.parseUrl(this.router.url).queryParams;
        void this.router.navigate(['/', result.request.locale, 'categories', result.category.slug], {
          queryParams,
          replaceUrl: true
        });
      }
      return;
    }
    this.category.set(result.category);
    this.products.set(result.products);
    this.pagination.set(result.pagination);
    this.filterGroups.set(result.filters);
    this.filtersFailed.set(result.filtersFailed);
    this.locale.setAlternateSlugs(result.category.alternateSlugs);
    this.status.set(result.products.length > 0 ? 'ready' : 'empty');
    this.applySeo(result.category, result.products, result.pagination, result.request.query);
  }

  private navigate(query: CategoryQueryState): void {
    const queryParams: Record<string, string | number> = {};
    if (query.page > 1) queryParams['page'] = query.page;
    if (query.sort !== 'latest') queryParams['sort'] = query.sort;
    for (const [key, value] of Object.entries(query.filters)) queryParams[key] = value;
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  private applySeo(
    category: CatalogCategory,
    products: readonly CatalogProduct[],
    pagination: CatalogPagination,
    query: CategoryQueryState
  ): void {
    const locale = this.locale.locale();
    const filtered = query.sort !== 'latest' || Object.keys(query.filters).length > 0;
    const categoryPath = `/${locale}/categories/${encodeURIComponent(category.slug)}`;
    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: this.locale.translate('nav.home'),
          item: this.urls.site(`/${locale}`)
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category.name,
          item: this.urls.site(categoryPath)
        }
      ]
    };
    const itemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      numberOfItems: pagination.totalItems,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: (pagination.page - 1) * pagination.limit + index + 1,
        name: product.name,
        url: this.urls.site(`/${locale}/products/${encodeURIComponent(product.slug)}`)
      }))
    };
    this.seo.apply({
      title: category.seo.title || `${category.name} | ${this.locale.translate('app.brandName')}`,
      description: category.seo.description || category.description,
      path: category.seo.canonicalPath || categoryPath,
      locale,
      robots: filtered ? 'noindex,follow' : category.seo.robots,
      alternatePaths: category.seo.alternatePaths,
      imageUrl: category.imageUrl || undefined,
      structuredData: products.length > 0 ? [breadcrumbs, itemList] : [breadcrumbs]
    });
  }

  private applyFallbackSeo(kind: 'missing' | 'malformed' | 'error'): void {
    const locale = this.locale.locale();
    this.seo.apply({
      title: this.locale.translate(kind === 'missing' ? 'category.notFoundTitle' : 'category.errorTitle'),
      description: this.locale.translate('category.errorDescription'),
      path: this.router.url.split('?')[0] ?? `/${locale}`,
      locale,
      robots: 'noindex,follow'
    });
  }
}

function requestFromRoute(params: ParamMap, queryParams: ParamMap, locale: SupportedLocale): CategoryRequest {
  const pageValue = Number(queryParams.get('page'));
  const sortValue = queryParams.get('sort');
  const filters: Record<string, string> = {};
  for (const key of queryParams.keys) {
    if (!filterTitleFromQueryKey(key)) continue;
    const value = queryParams.get(key)?.trim();
    if (value) filters[filterQueryKey(filterTitleFromQueryKey(key))] = value;
  }
  return {
    locale,
    slug: params.get('categorySlug')?.trim() ?? '',
    query: {
      page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
      sort: sortValue === 'price_asc' || sortValue === 'price_desc' ? sortValue : 'latest',
      filters
    }
  };
}

function emptyQuery(): CategoryQueryState {
  return { page: 1, sort: 'latest', filters: {} };
}
