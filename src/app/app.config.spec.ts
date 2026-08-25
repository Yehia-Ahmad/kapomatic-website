import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { appConfig } from './app.config';
import { config as serverAppConfig } from './app.config.server';
import {
  APP_RUNTIME_CONFIG,
  APP_RUNTIME_CONFIG_OVERRIDE,
  normalizeRuntimeConfig
} from './core/config/app-runtime-config';
import { ApiUrlBuilder } from './core/http/api-url.builder';
import { LocaleService } from './core/i18n/locale.service';
import { ThemeService } from './core/theme/theme.service';
import { StorefrontSettingsStore } from './domains/settings/storefront-settings.store';

describe('application runtime configuration', () => {
  it('resolves ApiUrlBuilder and runs the settings initializer from the real browser appConfig', async () => {
    const consoleWarning = spyOn(console, 'warn');
    const calls: string[] = [];
    const get = jasmine.createSpy('get').and.returnValue(of({ mainColor: '#F5B700' }));
    const injector = createEnvironmentInjector(
      [
        ...(appConfig.providers ?? []),
        { provide: HttpClient, useValue: { get } },
        ApiUrlBuilder,
        StorefrontSettingsStore,
        { provide: ThemeService, useValue: { initialize: () => calls.push('theme') } },
        { provide: LocaleService, useValue: { initialize: () => calls.push('locale') } }
      ],
      TestBed.inject(EnvironmentInjector)
    );

    try {
      const runtimeConfig = injector.get(APP_RUNTIME_CONFIG);
      const urls = injector.get(ApiUrlBuilder);
      expect(runtimeConfig.apiBaseUrl).toBe('/api');
      expect(runtimeConfig.siteUrl).toBe('');
      expect(urls.api('/categories')).toBe('/api/categories');
      expect(urls.site('/ar')).toBe('/ar');

      const initializers = injector.get(APP_INITIALIZER);
      const results = initializers.map((initializer) => initializer());
      await Promise.all(results.map((result) => Promise.resolve(result)));

      expect(get).toHaveBeenCalledWith('/api/ecommerce-settings/general');
      expect(injector.get(StorefrontSettingsStore).status()).toBe('ready');
      expect(calls).toEqual(['locale', 'theme']);
      expect(
        consoleWarning.calls.allArgs().every(([message]) => String(message).includes('NG0505'))
      ).toBeTrue();
    } finally {
      injector.destroy();
    }
  });

  it('retains the shared token in server config and uses a normalized request override', () => {
    const consoleWarning = spyOn(console, 'warn');
    const requestConfig = normalizeRuntimeConfig({
      production: true,
      apiBaseUrl: 'https://public-api.example/api/',
      siteUrl: 'https://store.example/',
      baseHref: '/',
      requestTimeoutMs: 12_000
    });
    const requestInjector = createEnvironmentInjector(
      [{ provide: APP_RUNTIME_CONFIG_OVERRIDE, useValue: requestConfig }],
      TestBed.inject(EnvironmentInjector)
    );
    const serverInjector = createEnvironmentInjector(
      [...(serverAppConfig.providers ?? []), ApiUrlBuilder],
      requestInjector
    );

    try {
      expect(serverInjector.get(APP_RUNTIME_CONFIG)).toEqual(requestConfig);
      expect(serverInjector.get(ApiUrlBuilder).api('settings')).toBe(
        'https://public-api.example/api/settings'
      );
      expect(
        consoleWarning.calls.allArgs().every(([message]) => String(message).includes('NG0505'))
      ).toBeTrue();
    } finally {
      serverInjector.destroy();
      requestInjector.destroy();
    }
  });
});
