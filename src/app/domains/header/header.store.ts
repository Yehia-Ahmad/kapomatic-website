import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { API_ENDPOINTS, SupportedLocale } from '../../core/http/api-endpoints';
import { normalizeApiError } from '../../core/http/api-error.interceptor';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import {
  fallbackHeaderConfig,
  normalizeCategoryNavigation,
  normalizeHeaderConfig
} from './header.normalizer';
import { HeaderConfig } from './header.models';

export type HeaderStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class HeaderStore {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly configSignal = signal<HeaderConfig>(fallbackHeaderConfig('ar'));
  private readonly statusSignal = signal<HeaderStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);
  private readonly requests = new Map<SupportedLocale, Observable<HeaderConfig>>();

  readonly config = this.configSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(locale: SupportedLocale, force = false): void {
    if (!force && this.configSignal().locale === locale && this.statusSignal() !== 'idle') return;
    this.statusSignal.set('loading');
    this.errorSignal.set(null);
    this.request(locale, force).subscribe((config) => {
      this.configSignal.set(config);
      this.statusSignal.set(this.errorSignal() ? 'error' : 'ready');
    });
  }

  private request(locale: SupportedLocale, force: boolean): Observable<HeaderConfig> {
    const stateKey = makeStateKey<HeaderConfig>(`kapomatic-header-v1-${locale}`);
    if (!force && this.transferState.hasKey(stateKey)) {
      const config = this.transferState.get(stateKey, fallbackHeaderConfig(locale));
      if (this.isBrowser) this.transferState.remove(stateKey);
      return of(config);
    }
    const existing = this.requests.get(locale);
    if (!force && existing) return existing;

    const request = this.http.get<unknown>(this.urls.api(API_ENDPOINTS.publicHeader)).pipe(
      map((response) => normalizeHeaderConfig(response, locale)),
      catchError((error: unknown) => {
        const normalized = error instanceof ApiError ? error : normalizeApiError(error);
        if (normalized.status !== 404 && normalized.status !== 501) {
          this.errorSignal.set(normalized);
          return of(fallbackHeaderConfig(locale));
        }
        return this.http
          .get<unknown>(this.urls.api(API_ENDPOINTS.sitemapCategories), {
            params: new HttpParams().set('limit', 100)
          })
          .pipe(
            map((response) => ({
              ...fallbackHeaderConfig(locale),
              navigation: normalizeCategoryNavigation(response, locale)
            })),
            catchError(() => of(fallbackHeaderConfig(locale)))
          );
      }),
      tap((config) => {
        if (!this.isBrowser) this.transferState.set(stateKey, config);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.requests.set(locale, request);
    return request;
  }
}
