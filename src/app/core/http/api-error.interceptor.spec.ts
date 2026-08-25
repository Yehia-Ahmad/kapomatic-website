import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_RUNTIME_CONFIG, normalizeRuntimeConfig } from '../config/app-runtime-config';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor platform handling', () => {
  function configure(platformId: 'browser' | 'server'): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: normalizeRuntimeConfig({ apiBaseUrl: '/api' })
        },
        { provide: PLATFORM_ID, useValue: platformId }
      ]
    });
  }

  it('fails a relative server API request immediately instead of recursively rendering it', () => {
    const consoleWarning = spyOn(console, 'warn');
    configure('server');
    let failure: unknown;

    TestBed.inject(HttpClient)
      .get('/api/ecommerce-settings/general')
      .subscribe({ error: (error: unknown) => (failure = error) });

    expect(failure).toEqual(
      jasmine.objectContaining<ApiError>({
        kind: 'server',
        status: 502,
        code: 'SSR_API_BASE_URL_REQUIRED',
        retryable: true
      })
    );
    TestBed.inject(HttpTestingController).expectNone('/api/ecommerce-settings/general');
    expect(
      consoleWarning.calls.allArgs().every(([message]) => String(message).includes('NG02801'))
    ).toBeTrue();
  });

  it('keeps relative API requests available to the browser proxy', () => {
    configure('browser');
    TestBed.inject(HttpClient).get('/api/ecommerce-settings/general').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/ecommerce-settings/general');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
