import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { normalizeApiError } from '../../core/http/api-error.interceptor';
import { API_ENDPOINTS } from '../../core/http/api-endpoints';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import {
  DEFAULT_STOREFRONT_SETTINGS,
  PersistedStorefrontSettingsV1,
  StorefrontSettings
} from './settings.models';
import { normalizeStorefrontSettings, readPersistedSettings } from './settings.normalizer';

export type SettingsStatus = 'idle' | 'loading' | 'ready' | 'error';

const SETTINGS_STATE_KEY = makeStateKey<StorefrontSettings>('kapomatic-storefront-settings-v1');
const STORAGE_KEY = 'kapomatic-storefront-settings';
const MAX_CACHE_BYTES = 512_000;

@Injectable({ providedIn: 'root' })
export class StorefrontSettingsStore {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly settingsSignal = signal<StorefrontSettings>(DEFAULT_STOREFRONT_SETTINGS);
  private readonly statusSignal = signal<SettingsStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);
  private request$: Observable<StorefrontSettings> | null = null;

  readonly settings = this.settingsSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  async loadForBootstrap(): Promise<void> {
    const transferred = this.readTransferredSettings();
    if (transferred) {
      this.useSettings(transferred);
      this.revalidateInBrowser();
      return;
    }

    const cached = this.readBrowserCache();
    if (cached) {
      this.useSettings(cached.settings);
      this.revalidateInBrowser();
      return;
    }

    await firstValueFrom(this.refresh()).then(() => undefined);
  }

  refresh(): Observable<StorefrontSettings> {
    if (this.request$) return this.request$;

    this.statusSignal.set('loading');
    this.errorSignal.set(null);
    this.request$ = this.http.get<unknown>(this.urls.api(API_ENDPOINTS.generalSettings)).pipe(
      map((response) => normalizeStorefrontSettings(response)),
      tap((settings) => {
        this.useSettings(settings);
        if (this.isBrowser) this.writeBrowserCache(settings);
        else this.transferState.set(SETTINGS_STATE_KEY, settings);
      }),
      catchError((error: unknown) => {
        const normalized = error instanceof ApiError ? error : normalizeApiError(error);
        this.errorSignal.set(normalized);
        this.statusSignal.set('error');
        const fallback = this.settingsSignal();
        if (!this.isBrowser) this.transferState.set(SETTINGS_STATE_KEY, fallback);
        return of(fallback);
      }),
      finalize(() => {
        this.request$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.request$;
  }

  private useSettings(settings: StorefrontSettings): void {
    this.settingsSignal.set(settings);
    this.statusSignal.set('ready');
    this.errorSignal.set(null);
  }

  private readTransferredSettings(): StorefrontSettings | null {
    if (!this.transferState.hasKey(SETTINGS_STATE_KEY)) return null;
    const settings = normalizeStorefrontSettings(
      this.transferState.get(SETTINGS_STATE_KEY, DEFAULT_STOREFRONT_SETTINGS)
    );
    if (this.isBrowser) this.transferState.remove(SETTINGS_STATE_KEY);
    return settings;
  }

  private revalidateInBrowser(): void {
    if (!this.isBrowser) return;
    queueMicrotask(() => this.refresh().subscribe());
  }

  private readBrowserCache(): PersistedStorefrontSettingsV1 | null {
    if (!this.isBrowser || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? readPersistedSettings(JSON.parse(raw) as unknown) : null;
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage can be unavailable in privacy modes; the network remains authoritative.
      }
      return null;
    }
  }

  private writeBrowserCache(settings: StorefrontSettings): void {
    if (!this.isBrowser || typeof localStorage === 'undefined') return;
    const value: PersistedStorefrontSettingsV1 = {
      version: 1,
      updatedAt: new Date().toISOString(),
      settings
    };

    try {
      const serialized = JSON.stringify(value);
      if (serialized.length <= MAX_CACHE_BYTES) localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // A cache write failure must never prevent rendering authoritative settings.
    }
  }
}
