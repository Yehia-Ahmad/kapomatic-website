export interface HomeCategoryImageDto {
  readonly url: string;
  readonly alt: string;
}

export interface HomeCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly localizedSlugs: {
    readonly ar: string | null;
    readonly en: string | null;
  };
  readonly image: HomeCategoryImageDto | null;
  readonly productsCount: number;
}

export interface HomeCategoriesResponseDto {
  readonly success: true;
  readonly data: {
    readonly categories: readonly HomeCategoryDto[];
  };
}

export class HomeCategoriesContractError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'HomeCategoriesContractError';
  }
}
