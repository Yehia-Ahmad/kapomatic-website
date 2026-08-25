import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, tap, throwError } from 'rxjs';
import { API_ENDPOINTS, SupportedLocale } from '../../core/http/api-endpoints';
import { ApiError } from '../../core/http/api-error';
import { normalizeApiError } from '../../core/http/api-error.interceptor';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import {
  normalizeDynamicHomePage,
  normalizeLegacyCategories,
  normalizeLegacyPromotions
} from './home.normalizer';
import { HomeContentIssue, HomeContractError, HomePageContent } from './home.models';

type LegacyRegion<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: HomeContentIssue };

@Injectable({ providedIn: 'root' })
export class HomeRepository {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly requests = new Map<SupportedLocale, Observable<HomePageContent>>();

  load(locale: SupportedLocale, force = false): Observable<HomePageContent> {
    const stateKey = makeStateKey<HomePageContent>(`kapomatic-home-v1-${locale}`);
    if (!force && this.transferState.hasKey(stateKey)) {
      const content = this.transferState.get(stateKey, emptyContent(locale));
      if (this.isBrowser) this.transferState.remove(stateKey);
      return of(content);
    }
    if (!force) {
      const request = this.requests.get(locale);
      if (request) return request;
    }

    const request = this.loadDynamic(locale).pipe(
      tap((content) => {
        if (!this.isBrowser) this.transferState.set(stateKey, content);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.requests.set(locale, request);
    return request;
  }

  private loadDynamic(locale: SupportedLocale): Observable<HomePageContent> {
    const params = new HttpParams().set('device', 'desktop').set('locale', locale);
    return this.http.get<unknown>(this.urls.api(API_ENDPOINTS.publicHomePage), { params }).pipe(
      map((response) => normalizeDynamicHomePage(response, locale).content),
      catchError((error: unknown) => {
        const normalized = error instanceof ApiError ? error : normalizeApiError(error);
        return isUnsupportedCapability(normalized) ? this.loadLegacy(locale) : throwError(() => error);
      })
    );
  }

  private loadLegacy(locale: SupportedLocale): Observable<HomePageContent> {
    const categories = forkJoin({
      selected: this.http.get<unknown>(this.urls.api(API_ENDPOINTS.homePageCategories)),
      active: this.http.get<unknown>(this.urls.api(API_ENDPOINTS.activeCategories))
    }).pipe(
      map(
        ({ selected, active }) =>
          ({ ok: true, value: normalizeLegacyCategories(selected, active, locale) }) as const
      ),
      catchError((error: unknown) => of({ ok: false, issue: issueFromError('categories', error) } as const))
    );
    const promotions = this.http
      .get<unknown>(this.urls.api(API_ENDPOINTS.activeWebsiteImagesWithProducts))
      .pipe(
        map((response) => ({ ok: true, value: normalizeLegacyPromotions(response, locale) }) as const),
        catchError((error: unknown) => of({ ok: false, issue: issueFromError('promotions', error) } as const))
      );

    return forkJoin({ categories, promotions }).pipe(
      map((regions) => legacyContent(locale, regions.categories, regions.promotions))
    );
  }
}

function legacyContent(
  locale: SupportedLocale,
  categories: LegacyRegion<ReturnType<typeof normalizeLegacyCategories>>,
  promotions: LegacyRegion<ReturnType<typeof normalizeLegacyPromotions>>
): HomePageContent {
  return {
    locale,
    source: 'legacy-confirmed',
    sections: [...(promotions.ok ? promotions.value : []), ...(categories.ok ? categories.value : [])],
    issues: [...(promotions.ok ? [] : [promotions.issue]), ...(categories.ok ? [] : [categories.issue])],
    capabilities: {
      dynamicBuilder: false,
      legacyCategories: categories.ok,
      legacyPromotions: promotions.ok,
      bundles: false
    }
  };
}

function issueFromError(region: HomeContentIssue['region'], error: unknown): HomeContentIssue {
  if (error instanceof HomeContractError) {
    return { region, kind: 'contract', code: error.code, retryable: false };
  }
  const normalized = error instanceof ApiError ? error : normalizeApiError(error);
  return {
    region,
    kind: 'request',
    code: normalized.code,
    retryable: normalized.retryable
  };
}

function isUnsupportedCapability(error: ApiError): boolean {
  return error.status === 404 || error.status === 501;
}

function emptyContent(locale: SupportedLocale): HomePageContent {
  return {
    locale,
    source: 'dynamic-builder',
    sections: [],
    issues: [],
    capabilities: {
      dynamicBuilder: false,
      legacyCategories: false,
      legacyPromotions: false,
      bundles: false
    }
  };
}
