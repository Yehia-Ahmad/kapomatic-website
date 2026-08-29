import { SupportedLocale } from '../../core/http/api-endpoints';
import { NormalizedPrice } from '../../shared/pricing/normalized-price';

export type CatalogAvailability = 'in-stock' | 'out-of-stock' | 'unknown';

export interface AlternateSlugs {
  readonly ar?: string;
  readonly en?: string;
}

export interface CatalogSeo {
  readonly title: string;
  readonly description: string;
  readonly robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  readonly canonicalPath: string;
  readonly alternatePaths: { readonly ar?: string; readonly en?: string; readonly xDefault?: string };
}

export interface CatalogCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly slug: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly alternateSlugs: AlternateSlugs;
  readonly seo: CatalogSeo;
}

export interface CatalogProductImage {
  readonly id: string;
  readonly url: string;
  readonly alt: string;
}

export interface CatalogSpecification {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

export interface CatalogProductCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface CatalogProduct {
  readonly id: string;
  readonly locale: SupportedLocale;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly brand: string;
  readonly code: string;
  readonly slug: string;
  readonly alternateSlugs: AlternateSlugs;
  readonly category: CatalogProductCategory | null;
  readonly images: readonly CatalogProductImage[];
  readonly price: NormalizedPrice | null;
  readonly availability: CatalogAvailability;
  readonly availableQuantity: number | null;
  readonly specifications: readonly CatalogSpecification[];
  readonly rating: number | null;
  readonly reviewCount: number | null;
  readonly seo: CatalogSeo;
}

export interface CatalogPagination {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface CategoryProductsResult {
  readonly category: CatalogCategory;
  readonly products: readonly CatalogProduct[];
  readonly pagination: CatalogPagination;
}

export interface CatalogFilterValue {
  readonly id: string;
  readonly label: string;
  readonly count: number | null;
  readonly disabled: boolean;
}

export interface CatalogFilterGroup {
  readonly id: string;
  readonly title: string;
  readonly values: readonly CatalogFilterValue[];
}

export interface CategoryQueryState {
  readonly page: number;
  readonly sort: 'latest' | 'price_asc' | 'price_desc';
  readonly filters: Readonly<Record<string, string>>;
}

export class CatalogContractError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'CatalogContractError';
  }
}
