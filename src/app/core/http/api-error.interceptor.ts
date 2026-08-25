import { isPlatformServer } from '@angular/common';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { TimeoutError, catchError, throwError, timeout } from 'rxjs';
import { APP_RUNTIME_CONFIG } from '../config/app-runtime-config';
import { ApiError, ApiErrorKind } from './api-error';

export const REQUEST_TIMEOUT_MS = new HttpContextToken<number | null>(() => null);

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(APP_RUNTIME_CONFIG);
  const platformId = inject(PLATFORM_ID);
  const timeoutMs = request.context.get(REQUEST_TIMEOUT_MS) ?? config.requestTimeoutMs;

  if (
    isPlatformServer(platformId) &&
    config.apiBaseUrl.startsWith('/') &&
    request.url.startsWith(config.apiBaseUrl)
  ) {
    return throwError(() => new ApiError('server', 502, 'SSR_API_BASE_URL_REQUIRED', true, ''));
  }

  return next(request).pipe(
    timeout(timeoutMs),
    catchError((error: unknown) => throwError(() => normalizeApiError(error)))
  );
};

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TimeoutError) {
    return new ApiError('timeout', 0, 'REQUEST_TIMEOUT', true, '');
  }
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('unknown', 0, 'UNKNOWN_ERROR', false, '');
  }

  const payload = asRecord(error.error);
  const status = error.status;
  const correlationId =
    error.headers?.get('x-request-id') ??
    error.headers?.get('x-correlation-id') ??
    readString(payload['correlationId']) ??
    '';
  const code = readString(payload['code']) ?? statusCode(status);

  return new ApiError(
    errorKind(status),
    status,
    code,
    status === 0 || status === 408 || status === 429 || status >= 500,
    correlationId,
    validationErrors(payload['errors'])
  );
}

function errorKind(status: number): ApiErrorKind {
  if (status === 0) return 'offline';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function statusCode(status: number): string {
  return status > 0 ? `HTTP_${status}` : 'NETWORK_ERROR';
}

function validationErrors(value: unknown): Readonly<Record<string, readonly string[]>> {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, messages]) => [key, toMessages(messages)] as const)
      .filter((entry) => entry[1].length > 0)
  );
}

function toMessages(value: unknown): readonly string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return typeof value === 'string' ? [value] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
