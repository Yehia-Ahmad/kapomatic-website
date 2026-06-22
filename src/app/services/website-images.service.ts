import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { EcommerceProduct, EcommerceService } from './ecommerce.service';

export type WebsiteImageTargetType = 'category' | 'product' | 'both' | 'price' | string;

export type TargetedWebsiteImage = {
  id: string;
  title: string;
  imageSrc: string;
  targetType: WebsiteImageTargetType;
  categoryIds: string[];
  productIds: string[];
  maxPrice: number | null;
  resolvedProducts: EcommerceProduct[];
};

@Injectable({ providedIn: 'root' })
export class WebsiteImagesService {
  private readonly http = inject(HttpClient);
  private readonly ecommerceService = inject(EcommerceService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = environment.api_base_url.replace(/\/+$/, '');
  private readonly apiOrigin = new URL(this.apiBaseUrl).origin;
  private readonly resolvedProductsCache = new Map<string, EcommerceProduct[]>();
  private readonly imagesCache = new Map<string, TargetedWebsiteImage>();

  getActiveWithProducts(): Observable<TargetedWebsiteImage[]> {
    if (!isPlatformBrowser(this.platformId)) return of([]);

    return this.http.get<unknown>(`${this.apiBaseUrl}/website-images/active-with-products`).pipe(
      map((response) => this.readArray(response).map((item) => this.mapWebsiteImage(item))),
      tap((images) => {
        for (const image of images) {
          this.imagesCache.set(image.id, image);
          if (image.resolvedProducts.length > 0) {
            this.resolvedProductsCache.set(image.id, this.uniqueProducts(image.resolvedProducts));
          }
        }
      })
    );
  }

  getProducts(imageId: string): Observable<EcommerceProduct[]> {
    const cached = this.resolvedProductsCache.get(imageId);
    if (cached) return of(cached);
    if (!isPlatformBrowser(this.platformId)) return of([]);

    return this.http.get<unknown>(`${this.apiBaseUrl}/website-images/${encodeURIComponent(imageId)}/products`).pipe(
      map((response) => this.uniqueProducts(this.ecommerceService.mapProductsResponse(response))),
      catchError(() => of([] as EcommerceProduct[])),
      switchMap((products) =>
        products.length > 0 ? of(products) : this.getTargetImage(imageId).pipe(switchMap((image) => this.resolveTargets(image)))
      ),
      map((products) => this.uniqueProducts(products)),
      tap((products) => this.resolvedProductsCache.set(imageId, products))
    );
  }

  private getTargetImage(imageId: string): Observable<TargetedWebsiteImage> {
    const cached = this.imagesCache.get(imageId);
    if (cached) return of(cached);
    return this.getActiveWithProducts().pipe(
      map((images) => images.find((image) => image.id === imageId)),
      switchMap((image) => (image ? of(image) : of(this.emptyWebsiteImage(imageId))))
    );
  }

  private resolveTargets(image: TargetedWebsiteImage): Observable<EcommerceProduct[]> {
    if (image.resolvedProducts.length > 0) return of(image.resolvedProducts);

    switch (image.targetType) {
      case 'category':
        return this.productsFromCategories(image.categoryIds);
      case 'product':
        return this.allActiveProducts().pipe(
          map((products) => products.filter((product) => image.productIds.includes(product.id)))
        );
      case 'both':
        return forkJoin([
          this.productsFromCategories(image.categoryIds),
          this.allActiveProducts().pipe(
            map((products) => products.filter((product) => image.productIds.includes(product.id)))
          )
        ]).pipe(map(([categoryProducts, selectedProducts]) => [...categoryProducts, ...selectedProducts]));
      case 'price': {
        const source = image.categoryIds.length > 0
          ? this.productsFromCategories(image.categoryIds)
          : this.allActiveProducts();
        return source.pipe(
          map((products) =>
            image.maxPrice === null
              ? products
              : products.filter((product) => product.retailPrice <= image.maxPrice!)
          )
        );
      }
      default:
        return of([]);
    }
  }

  private productsFromCategories(categoryIds: string[]): Observable<EcommerceProduct[]> {
    if (categoryIds.length === 0) return of([]);
    return forkJoin(
      categoryIds.map((categoryId) =>
        this.ecommerceService
          .getProductsByActiveCategory(categoryId)
          .pipe(catchError(() => of([] as EcommerceProduct[])))
      )
    ).pipe(map((groups) => groups.flat()));
  }

  private allActiveProducts(): Observable<EcommerceProduct[]> {
    return this.ecommerceService.getActiveCategoriesWithProductsAndSettings().pipe(
      map((categories) => categories.flatMap((category) => category.products)),
      catchError(() => of([]))
    );
  }

  private mapWebsiteImage(source: unknown): TargetedWebsiteImage {
    const item = this.asRecord(source);
    const resolvedProducts = this.ecommerceService.mapProductsResponse(
      item['resolvedProducts'] ?? item['products'] ?? []
    );

    return {
      id: this.readString(item, ['_id', 'id']),
      title: this.readString(item, ['title', 'name']),
      imageSrc: this.imageSource(this.readString(item, ['imageBase64', 'image', 'imageUrl'])),
      targetType: this.readString(item, ['targetType', 'type']).toLowerCase(),
      categoryIds: this.readIds(item['categoryIds'] ?? item['categories']),
      productIds: this.readIds(item['productIds'] ?? item['products']),
      maxPrice: this.readOptionalNumber(item['maxPrice']),
      resolvedProducts: this.uniqueProducts(resolvedProducts)
    };
  }

  private emptyWebsiteImage(id: string): TargetedWebsiteImage {
    return {
      id,
      title: '',
      imageSrc: '',
      targetType: '',
      categoryIds: [],
      productIds: [],
      maxPrice: null,
      resolvedProducts: []
    };
  }

  private uniqueProducts(products: EcommerceProduct[]): EcommerceProduct[] {
    const unique = new Map<string, EcommerceProduct>();
    for (const product of products) {
      if (product.id && !unique.has(product.id)) unique.set(product.id, product);
    }
    return Array.from(unique.values());
  }

  private imageSource(value: string): string {
    if (!value) return '';
    if (/^(data:image\/|https?:\/\/)/i.test(value)) return value;
    if (value.startsWith('/')) return `${this.apiOrigin}${value}`;
    if (value.startsWith('api/')) return `${this.apiOrigin}/${value}`;
    return `data:image/jpeg;base64,${value}`;
  }

  private readArray(source: unknown): unknown[] {
    if (Array.isArray(source)) return source;
    const root = this.asRecord(source);
    for (const key of ['data', 'result', 'results', 'items', 'images', 'websiteImages']) {
      const value = root[key];
      if (Array.isArray(value)) return value;
      const nested = this.asRecord(value);
      for (const nestedKey of ['items', 'images', 'websiteImages']) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
    return [];
  }

  private readIds(source: unknown): string[] {
    if (!Array.isArray(source)) return [];
    return Array.from(
      new Set(
        source
          .map((value) =>
            typeof value === 'string' || typeof value === 'number'
              ? String(value)
              : this.readString(this.asRecord(value), ['_id', 'id'])
          )
          .filter(Boolean)
      )
    );
  }

  private readString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return '';
  }

  private readOptionalNumber(value: unknown): number | null {
    const number = Number(value);
    return value !== '' && value != null && Number.isFinite(number) ? number : null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
