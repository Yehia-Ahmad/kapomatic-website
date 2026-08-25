import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideClientHydration, withNoHttpTransferCache } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideRuntimeConfig } from './core/config/app-runtime-config';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { LocaleService } from './core/i18n/locale.service';
import { ThemeService } from './core/theme/theme.service';
import { StorefrontSettingsStore } from './domains/settings/storefront-settings.store';
import { environment } from '../environments/environment';

function initializeApplication(
  settings: StorefrontSettingsStore,
  theme: ThemeService,
  locale: LocaleService
): () => Promise<void> {
  return async () => {
    locale.initialize();
    await settings.loadForBootstrap();
    theme.initialize();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRuntimeConfig(environment),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
    provideClientHydration(withNoHttpTransferCache()),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeApplication,
      deps: [StorefrontSettingsStore, ThemeService, LocaleService]
    }
  ]
};
