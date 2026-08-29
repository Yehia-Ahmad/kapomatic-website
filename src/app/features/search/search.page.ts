import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faMagnifyingGlass,
  faRotate,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import {
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap
} from 'rxjs';
import { SupportedLocale } from '../../core/http/api-endpoints';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import {
  CatalogContractError,
  CatalogPagination,
  CatalogProduct
} from '../../domains/catalog/catalog.models';
import { CatalogRepository } from '../../domains/catalog/catalog.repository';
import { CatalogProductCardComponent } from '../category/components/catalog-product-card.component';

type SearchStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'empty'
  | 'error'
  | 'malformed'
  | 'pagination-error';

interface SearchRequest {
  readonly locale: SupportedLocale;
  readonly query: string;
  readonly page: number;
}

type SearchLoadResult =
  | { readonly kind: 'idle'; readonly request: SearchRequest }
  | {
      readonly kind: 'loaded';
      readonly request: SearchRequest;
      readonly products: readonly CatalogProduct[];
      readonly pagination: CatalogPagination;
    }
  | { readonly kind: 'malformed'; readonly request: SearchRequest }
  | { readonly kind: 'error'; readonly request: SearchRequest };

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, FaIconComponent, CatalogProductCardComponent],
  templateUrl: './search.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {
  protected readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(CatalogRepository);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryRequest = new Subject<void>();

  protected readonly status = signal<SearchStatus>('idle');
  protected readonly query = signal('');
  protected readonly products = signal<readonly CatalogProduct[]>([]);
  protected readonly pagination = signal<CatalogPagination | null>(null);
  protected queryInput = '';
  protected readonly icons = {
    search: faMagnifyingGlass,
    retry: faRotate,
    warning: faTriangleExclamation,
    previous: faChevronLeft,
    next: faChevronRight
  };

  constructor() {
    combineLatest([
      combineLatest([this.route.queryParamMap, toObservable(this.locale.locale)]).pipe(
        map(([queryParams, locale]) => requestFromRoute(queryParams, locale)),
        distinctUntilChanged((left, right) => JSON.stringify(left) === JSON.stringify(right))
      ),
      this.retryRequest.pipe(startWith(undefined))
    ])
      .pipe(
        map(([request]) => request),
        tap((request) => this.prepareRequest(request)),
        switchMap((request) => this.load(request)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => this.applyResult(result));
  }

  protected submitSearch(): void {
    const query = normalizeQuery(this.queryInput);
    if (!query) return;
    void this.router.navigate(['/', this.locale.locale(), 'search'], { queryParams: { q: query } });
  }

  protected retry(): void {
    this.retryRequest.next();
  }

  protected goToPage(page: number): void {
    const pagination = this.pagination();
    if (!pagination || page < 1 || page > pagination.totalPages) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.query(), page: page > 1 ? page : null }
    });
  }

  private prepareRequest(request: SearchRequest): void {
    const queryChanged = request.query !== this.query();
    this.query.set(request.query);
    this.queryInput = request.query;
    if (!request.query) {
      this.products.set([]);
      this.pagination.set(null);
      this.status.set('idle');
      return;
    }
    if (queryChanged) {
      this.products.set([]);
      this.pagination.set(null);
    }
    this.status.set(!queryChanged && this.products().length > 0 ? 'refreshing' : 'loading');
  }

  private load(request: SearchRequest) {
    if (!request.query) return of({ kind: 'idle' as const, request });
    return this.repository.searchProducts(request.locale, request.query, request.page).pipe(
      map((result) => ({ kind: 'loaded' as const, request, ...result })),
      catchError((error: unknown) =>
        of({
          kind: error instanceof CatalogContractError ? ('malformed' as const) : ('error' as const),
          request
        })
      )
    );
  }

  private applyResult(result: SearchLoadResult): void {
    if (result.kind === 'idle') {
      this.applySeo(result.request);
      return;
    }
    if (result.kind === 'malformed' || result.kind === 'error') {
      this.status.set(
        this.products().length > 0 && result.request.page > 1 ? 'pagination-error' : result.kind
      );
      this.applySeo(result.request);
      return;
    }
    this.products.set(result.products);
    this.pagination.set(result.pagination);
    this.status.set(result.products.length > 0 ? 'ready' : 'empty');
    this.applySeo(result.request);
  }

  private applySeo(request: SearchRequest): void {
    this.seo.apply({
      title: request.query
        ? this.locale.interpolate('search.seoTitle', { query: request.query })
        : this.locale.translate('page.search'),
      description: this.locale.translate('search.seoDescription'),
      path: `/${request.locale}/search`,
      locale: request.locale,
      robots: 'noindex,follow'
    });
  }
}

function requestFromRoute(queryParams: ParamMap, locale: SupportedLocale): SearchRequest {
  const pageValue = Number(queryParams.get('page'));
  return {
    locale,
    query: normalizeQuery(queryParams.get('q') ?? ''),
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  };
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
