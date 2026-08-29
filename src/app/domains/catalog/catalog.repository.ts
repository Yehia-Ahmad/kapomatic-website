import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { API_ENDPOINTS, SupportedLocale } from '../../core/http/api-endpoints';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import {
  filterTitleFromQueryKey,
  normalizeCategoryProductsResponse,
  normalizeCategoryResponse,
  normalizeFilterGroups,
  normalizeProductResponse
} from './catalog.normalizer';
import {
  CatalogCategory,
  CatalogFilterGroup,
  CatalogProduct,
  CategoryProductsResult,
  CategoryQueryState
} from './catalog.models';

interface SlugAliasResult {
  readonly location: string;
  readonly statusCode: 301;
}

interface ProductLoadOptions {
  readonly transfer?: boolean;
  readonly force?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogRepository {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly categoryRequests = new Map<string, Observable<CatalogCategory>>();
  private readonly productRequests = new Map<string, Observable<CatalogProduct>>();
  private readonly filterRequests = new Map<string, Observable<readonly CatalogFilterGroup[]>>();

  loadCategory(locale: SupportedLocale, slug: string): Observable<CatalogCategory> {
    const requestKey = `${locale}:${slug}`;
    const stateKey = makeStateKey<CatalogCategory>(`kapomatic-category-v1-${requestKey}`);
    const transferred = this.fromTransferState(stateKey);
    if (transferred) return of(transferred);
    const existing = this.categoryRequests.get(requestKey);
    if (existing) return existing;
    const request = this.http.get<unknown>(this.urls.api(API_ENDPOINTS.category(locale, slug))).pipe(
      map((response) => normalizeCategoryResponse(response, locale, (source) => this.urls.image(source))),
      tap((category) => this.toTransferState(stateKey, category)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.categoryRequests.set(requestKey, request);
    return request;
  }

  loadCategoryProducts(
    locale: SupportedLocale,
    slug: string,
    query: CategoryQueryState
  ): Observable<CategoryProductsResult> {
    let params = new HttpParams().set('page', query.page).set('limit', 12);
    if (query.sort !== 'latest') params = params.set('sort', query.sort);
    for (const [key, selectedValue] of Object.entries(query.filters)) {
      const title = filterTitleFromQueryKey(key);
      if (title && selectedValue) params = params.set(title, selectedValue);
    }
    const requestKey = `${locale}:${slug}:${params.toString()}`;
    const stateKey = makeStateKey<CategoryProductsResult>(`kapomatic-category-products-v1-${requestKey}`);
    const transferred = this.fromTransferState(stateKey);
    if (transferred) return of(transferred);
    return this.http
      .get<unknown>(this.urls.api(API_ENDPOINTS.categoryProducts(locale, slug)), { params })
      .pipe(
        map((response) =>
          normalizeCategoryProductsResponse(response, locale, (source) => this.urls.image(source))
        ),
        tap((result) => this.toTransferState(stateKey, result))
      );
  }

  loadFilterGroups(categoryId: string): Observable<readonly CatalogFilterGroup[]> {
    const stateKey = makeStateKey<readonly CatalogFilterGroup[]>(
      `kapomatic-category-filters-v1-${categoryId}`
    );
    const transferred = this.fromTransferState(stateKey);
    if (transferred) return of(transferred);
    const existing = this.filterRequests.get(categoryId);
    if (existing) return existing;
    const request = this.http.get<unknown>(this.urls.api(API_ENDPOINTS.categoryFilters(categoryId))).pipe(
      map(normalizeFilterGroups),
      tap((groups) => this.toTransferState(stateKey, groups)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.filterRequests.set(categoryId, request);
    return request;
  }

  loadProduct(
    locale: SupportedLocale,
    slugOrId: string,
    options: ProductLoadOptions = {}
  ): Observable<CatalogProduct> {
    const transfer = options.transfer !== false;
    const requestKey = `${locale}:${slugOrId}`;
    const stateKey = makeStateKey<CatalogProduct>(`kapomatic-product-v1-${requestKey}`);
    if (transfer) {
      const transferred = this.fromTransferState(stateKey);
      if (transferred) return of(transferred);
    }
    if (!options.force) {
      const existing = this.productRequests.get(requestKey);
      if (existing) return existing;
    }
    const request = this.http.get<unknown>(this.urls.api(API_ENDPOINTS.product(locale, slugOrId))).pipe(
      map((response) => normalizeProductResponse(response, locale, (source) => this.urls.image(source))),
      tap((product) => {
        if (transfer) this.toTransferState(stateKey, product);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    if (!options.force) this.productRequests.set(requestKey, request);
    return request;
  }

  resolveAlias(
    locale: SupportedLocale,
    entity: 'category' | 'product',
    slug: string
  ): Observable<SlugAliasResult> {
    return this.http
      .get<unknown>(this.urls.api(API_ENDPOINTS.slugAlias(locale, entity, slug)))
      .pipe(map(normalizeAlias));
  }

  private fromTransferState<T>(key: ReturnType<typeof makeStateKey<T>>): T | null {
    if (!this.transferState.hasKey(key)) return null;
    const value = this.transferState.get<T | null>(key, null);
    if (this.isBrowser) this.transferState.remove(key);
    return value;
  }

  private toTransferState<T>(key: ReturnType<typeof makeStateKey<T>>, value: T): void {
    if (!this.isBrowser) this.transferState.set(key, value);
  }
}

function normalizeAlias(source: unknown): SlugAliasResult {
  const value = asRecord(source);
  const location = pathFromUrl(value['location']);
  if (value['redirect'] !== true || value['statusCode'] !== 301 || !location) {
    throw new Error('SLUG_ALIAS_RESPONSE_INVALID');
  }
  return { location, statusCode: 301 };
}

function pathFromUrl(source: unknown): string {
  if (typeof source !== 'string' || !source.trim()) return '';
  try {
    const url = new URL(source, 'https://kapomatic.invalid');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return source.startsWith('/') ? source : '';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
