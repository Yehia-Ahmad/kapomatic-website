export interface CartDisplaySnapshot {
  readonly name: string;
  readonly imageUrl: string;
  readonly unitPrice: number;
  readonly currency: string;
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
