export interface ApiEnvelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly pagination: PaginationMeta;
}

export interface LocalizedSlug {
  readonly ar: string | null;
  readonly en: string | null;
}
