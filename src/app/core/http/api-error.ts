export type ApiErrorKind =
  | 'timeout'
  | 'offline'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
    readonly correlationId: string,
    readonly validationErrors: Readonly<Record<string, readonly string[]>> = {}
  ) {
    super(code);
    this.name = 'ApiError';
  }
}
