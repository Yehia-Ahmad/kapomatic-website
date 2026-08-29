import { InjectionToken, Provider, inject } from '@angular/core';

export interface AppRuntimeConfig {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly siteUrl: string;
  readonly baseHref: string;
  readonly requestTimeoutMs: number;
}

export const APP_RUNTIME_CONFIG = new InjectionToken<AppRuntimeConfig>('APP_RUNTIME_CONFIG');

/**
 * Server renderers can supply a request-specific value without replacing the
 * shared APP_RUNTIME_CONFIG provider used by the browser application.
 */
export const APP_RUNTIME_CONFIG_OVERRIDE = new InjectionToken<AppRuntimeConfig>(
  'APP_RUNTIME_CONFIG_OVERRIDE'
);

export function provideRuntimeConfig(config: Partial<AppRuntimeConfig>): Provider {
  const validatedFallback = normalizeRuntimeConfig(config);

  return {
    provide: APP_RUNTIME_CONFIG,
    useFactory: () => {
      const override = inject(APP_RUNTIME_CONFIG_OVERRIDE, { optional: true });
      return override ? normalizeRuntimeConfig(override) : validatedFallback;
    }
  };
}

export function normalizeRuntimeConfig(config: Partial<AppRuntimeConfig>): AppRuntimeConfig {
  return {
    production: config.production === true,
    apiBaseUrl: normalizeBaseUrl(config.apiBaseUrl, '/api'),
    siteUrl: normalizeSiteUrl(config.siteUrl),
    baseHref: normalizeBaseHref(config.baseHref),
    requestTimeoutMs: normalizeTimeout(config.requestTimeoutMs)
  };
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (candidate.startsWith('/')) return `/${candidate.replace(/^\/+|\/+$/g, '')}`;

  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().replace(/\/+$/, '') : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSiteUrl(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

function normalizeBaseHref(value: string | undefined): string {
  const candidate = value?.trim() || '/';
  return `/${candidate.replace(/^\/+|\/+$/g, '')}${candidate === '/' ? '' : '/'}`;
}

function normalizeTimeout(value: number | undefined): number {
  return Number.isFinite(value) ? Math.min(30_000, Math.max(1_000, Math.trunc(value!))) : 80_000;
}
