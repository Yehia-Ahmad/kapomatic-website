import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { API_ENDPOINTS, SupportedLocale } from '../../core/http/api-endpoints';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import { HomeCategory } from './home.models';
import { normalizeHomeCategoriesResponse } from './home-categories.normalizer';

export const HOME_CATEGORIES_LIMIT = 12;

@Injectable({ providedIn: 'root' })
export class HomeCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly transferState = inject(TransferState);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly requests = new Map<SupportedLocale, Observable<readonly HomeCategory[]>>();

  load(locale: SupportedLocale, force = false): Observable<readonly HomeCategory[]> {
    const stateKey = makeStateKey<readonly HomeCategory[]>(`kapomatic-home-categories-v1-${locale}`);
    if (!force && this.transferState.hasKey(stateKey)) {
      const categories = this.transferState.get(stateKey, [] as readonly HomeCategory[]);
      if (this.isBrowser) this.transferState.remove(stateKey);
      const transferred = of(categories);
      this.requests.set(locale, transferred);
      return transferred;
    }
    if (!force) {
      const existing = this.requests.get(locale);
      if (existing) return existing;
    }

    const request = this.http
      .get<unknown>(this.urls.api(API_ENDPOINTS.publicHomeCategories(locale)), {
        params: new HttpParams().set('limit', HOME_CATEGORIES_LIMIT)
      })
      .pipe(
        map((response) => normalizeHomeCategoriesResponse(response, (source) => this.urls.image(source))),
        tap((categories) => {
          if (!this.isBrowser) this.transferState.set(stateKey, categories);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    this.requests.set(locale, request);
    return request;
  }
}
