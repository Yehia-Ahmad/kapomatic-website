import { AlternateSlugs, CatalogAvailability } from '../catalog/catalog.models';

export interface CartDisplaySnapshot {
  readonly name: string;
  readonly imageUrl: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly slug?: string;
  readonly alternateSlugs?: AlternateSlugs;
  readonly shortDescription?: string;
}

export interface CartLine {
  readonly productId: string;
  readonly quantity: number;
  readonly snapshot: CartDisplaySnapshot;
}

export interface PersistedCartV1 {
  readonly version: 1;
  readonly updatedAt: string;
  readonly lines: readonly CartLine[];
}

export interface PersistedCartV2 {
  readonly version: 2;
  readonly updatedAt: string;
  readonly lines: readonly CartLine[];
}

export interface CartAddOptions {
  readonly quantity?: number;
  readonly availability: CatalogAvailability;
  readonly maximumQuantity?: number | null;
}

export type CartRestorationState = 'server-shell' | 'restoring' | 'restored';
export type CartStorageIssue = 'none' | 'migrated' | 'corrupted' | 'unavailable';
