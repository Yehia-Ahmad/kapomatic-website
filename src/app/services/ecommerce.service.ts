import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export type ProductSpec = {
  label: string;
  value: string;
};

export type ProductImage = {
  id: string;
  src: string;
  alt: string;
};

export type EcommerceProduct = {
  id: string;
  categoryId?: string;
  title: string;
  subTitle: string;
  brand: string;
  price: number;
  retailPrice: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  imageSrc: string;
  images: ProductImage[];
  inStock: boolean;
  shippingNote: string;
  specs: ProductSpec[];
  oemRefs: string[];
};

export type EcommerceCategory = {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  products: EcommerceProduct[];
};

export type SpecificationFilter = {
  specification: string;
  value: string;
};

export type CategoryFilter = {
  label: string;
  values: string[];
  isVisible: boolean;
};

export type CategoryFiltersResult = {
  filters: CategoryFilter[];
  products: EcommerceProduct[];
};

export type HomePageCategory = EcommerceCategory & {
  products: EcommerceProduct[];
};

@Injectable({ providedIn: 'root' })
export class EcommerceService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = environment.api_base_url;
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  getActiveCategoriesWithProductsAndSettings(): Observable<EcommerceCategory[]> {
    if (!this.isBrowser) return of([]);

    return this.http
      .get<unknown>(this.apiUrl('ecommerce-settings/categories/active'))
      .pipe(map((response) => this.readArray(response).map((category) => this.mapCategory(category))));
  }

  getHomePageCategories(): Observable<HomePageCategory[]> {
    if (!this.isBrowser) return of([]);

    return this.http.get<unknown>(this.apiUrl('ecommerce-settings/home-page/categories')).pipe(
      map((response) => this.mapOrderedHomeCategories(response)),
      switchMap((categories) => {
        if (categories.length === 0) return of([]);
        return forkJoin(
          categories.map((category) =>
            this.getProductsByActiveCategory(category.id).pipe(
              map((products) => ({ ...category, products: this.uniqueProducts(products).slice(0, 10) })),
              catchError(() => of({ ...category, products: category.products.slice(0, 10) }))
            )
          )
        );
      })
    );
  }

  getProductsByActiveCategory(
    categoryId: string,
    filters: SpecificationFilter[] = []
  ): Observable<EcommerceProduct[]> {
    if (!this.isBrowser) return of([]);

    let params = new HttpParams();

    for (const filter of filters) {
      if (!filter.specification || !filter.value) continue;
      params = params.append('specification', filter.specification).append('value', filter.value);
    }

    return this.http
      .get<unknown>(this.apiUrl(`ecommerce-settings/categories/active/${categoryId}/products`), {
        params
      })
      .pipe(map((response) => this.readArray(response).map((product) => this.mapProduct(product, categoryId))));
  }

  getCategoryFilters(categoryId: string): Observable<CategoryFiltersResult> {
    if (!this.isBrowser) return of({ filters: [], products: [] });

    return this.http
      .get<unknown>(this.apiUrl(`ecommerce-settings/categories/${categoryId}/filters`))
      .pipe(map((response) => this.mapCategoryFiltersResult(response, categoryId)));
  }

  getProductByActiveCategory(categoryId: string, productId: string): Observable<EcommerceProduct> {
    if (!this.isBrowser) return of(this.emptyProduct(productId, categoryId));

    return this.http
      .get<unknown>(
        this.apiUrl(`ecommerce-settings/categories/active/${categoryId}/products/${productId}`)
      )
      .pipe(map((response) => this.mapProduct(this.readObject(response), categoryId)));
  }

  mapProductsResponse(source: unknown, categoryId?: string): EcommerceProduct[] {
    return this.readArray(source).map((product) => this.mapProduct(product, categoryId));
  }

  private apiUrl(path: string): string {
    return `${this.apiBaseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private mapOrderedHomeCategories(source: unknown): HomePageCategory[] {
    const root = this.asRecord(this.readObject(source));
    const categories = this.readArray(root['categories'] ?? source).map((category) => this.mapCategory(category));
    const categoryIds = this.readStringArray(root, ['categoryIds']);
    if (categoryIds.length === 0) return categories;

    const byId = new Map(categories.map((category) => [category.id, category]));
    return categoryIds.map((id) => byId.get(id)).filter((category): category is HomePageCategory => Boolean(category));
  }

  private uniqueProducts(products: EcommerceProduct[]): EcommerceProduct[] {
    const unique = new Map<string, EcommerceProduct>();
    for (const product of products) {
      if (product.id && !unique.has(product.id)) unique.set(product.id, product);
    }
    return Array.from(unique.values());
  }

  private mapCategory(source: unknown): EcommerceCategory {
    const item = this.asRecord(source);
    const id = this.readString(item, ['id', '_id', 'categoryId', 'category.id', 'category._id']);
    const title = this.readString(item, ['name', 'title', 'categoryName', 'category.name', 'category.title']);
    const products = this.readArray(
      item['products'] ??
        item['Products'] ??
        item['items'] ??
        item['categoryProducts'] ??
        this.asRecord(item['category'])['products']
    ).map((product) => this.mapProduct(product, id));

    return {
      id,
      title: title || 'قسم',
      subtitle: this.readString(item, ['description', 'subtitle', 'category.description']),
      imageSrc: this.readString(item, ['image', 'imageUrl', 'imageSrc', 'photo', 'category.image', 'category.imageUrl']),
      products
    };
  }

  private mapCategoryFiltersResult(source: unknown, categoryId: string): CategoryFiltersResult {
    if (Array.isArray(source)) {
      return {
        filters: this.readCategoryFilters(source),
        products: []
      };
    }

    const item = this.asRecord(this.readObject(source));
    const filtersSource =
      item['filters'] ??
      item['categoryFilters'] ??
      item['computedFilters'] ??
      item['specificationFilters'] ??
      item['specifications'] ??
      this.asRecord(item['category'])['filters'];
    const productsSource =
      item['products'] ??
      item['Products'] ??
      item['items'] ??
      item['categoryProducts'] ??
      this.asRecord(item['category'])['products'];

    return {
      filters: this.readCategoryFilters(filtersSource),
      products: this.readArray(productsSource).map((product) => this.mapProduct(product, categoryId))
    };
  }

  private readCategoryFilters(source: unknown): CategoryFilter[] {
    if (Array.isArray(source)) {
      return source
        .map((filter) => {
          const record = this.asRecord(filter);
          const label = this.readString(record, [
            'title',
            'specification',
            'name',
            'label',
            'key',
            'specification.name',
            'specification.title'
          ]);
          const values = this.readFilterValues(
            record['values'] ??
              record['uniqueValues'] ??
              record['options'] ??
              record['filterValues'] ??
              record['specificationValues']
          );
          const isVisible = this.readBoolean(record, ['isVisible', 'visible', 'showOnWebsite', 'specification.isVisible'], false);

          return label && values.length > 0 ? { label, values, isVisible } : null;
        })
        .filter((filter): filter is CategoryFilter => Boolean(filter));
    }

    const record = this.asRecord(source);
    return Object.entries(record)
      .map(([label, values]) => ({
        label,
        values: this.readFilterValues(values),
        isVisible: true
      }))
      .filter((filter) => filter.values.length > 0);
  }

  private readFilterValues(source: unknown): string[] {
    const values = Array.isArray(source) ? source : source ? [source] : [];
    return Array.from(
      new Set(
        values
          .map((value) => {
            if (typeof value === 'string' || typeof value === 'number') return String(value);
            return this.readString(this.asRecord(value), ['value', 'name', 'label', 'title']);
          })
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  private emptyProduct(productId: string, categoryId: string): EcommerceProduct {
    return {
      id: productId,
      categoryId,
      title: '',
      subTitle: '',
      brand: '',
      price: 0,
      retailPrice: 0,
      currency: 'د.إ',
      rating: 0,
      reviewsCount: 0,
      imageSrc: '',
      images: [],
      inStock: false,
      shippingNote: '',
      specs: [],
      oemRefs: []
    };
  }

  private mapProduct(source: unknown, categoryId?: string): EcommerceProduct {
    const item = this.asRecord(source);
    const id = this.readString(item, ['id', '_id', 'productId', 'product.id', 'product._id']);
    const title = this.readString(item, ['name', 'title', 'productName', 'product.name', 'product.title']);
    const images = this.readImages(item, title);
    const specs = this.readSpecs(item);

    return {
      id,
      categoryId:
        categoryId ||
        this.readString(item, ['categoryId', 'category.id', 'category._id', 'categoryId._id', 'categoryId.id']),
      title: title || 'منتج',
      subTitle: this.readString(item, ['subTitle', 'subtitle', 'description', 'shortDescription']),
      brand: this.readString(item, ['brand', 'brand.name', 'manufacturer', 'manufacturer.name']),
      price: this.readNumber(item, ['price', 'salePrice', 'retailPrice', 'regularPrice', 'ecommercePrice']),
      retailPrice: this.readNumber(item, ['retailPrice', 'price', 'salePrice', 'regularPrice', 'ecommercePrice']),
      currency: this.readString(item, ['currency', 'currencyCode']) || 'د.إ',
      rating: this.readNumber(item, ['rating', 'averageRating', 'reviewsSummary.rating']),
      reviewsCount: this.readNumber(item, ['reviewsCount', 'reviewCount', 'reviewsSummary.count']),
      imageSrc: images[0]?.src || '',
      images,
      inStock: this.readBoolean(item, ['inStock', 'isAvailable', 'available', 'stockStatus'], true),
      shippingNote: this.readString(item, ['shippingNote', 'deliveryNote']),
      specs,
      oemRefs: this.readStringArray(item, ['oemRefs', 'oemReferences', 'approvals', 'compatibilities'])
    };
  }

  private readImages(item: Record<string, unknown>, title: string): ProductImage[] {
    const rawImages =
      item['images'] ??
      item['Images'] ??
      item['gallery'] ??
      item['productImages'] ??
      item['imageUrls'] ??
      item['image'] ??
      item['imageUrl'] ??
      item['imageSrc'];
    const imageItems = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : [];

    return imageItems
      .map((image, index) => {
        const record = this.asRecord(image);
        const src =
          typeof image === 'string'
            ? image
            : this.readString(record, ['url', 'src', 'image', 'imageUrl', 'path', 'secure_url']);

        return src
          ? {
              id: this.readString(record, ['id', '_id']) || `img-${index + 1}`,
              src,
              alt: this.readString(record, ['alt', 'name', 'title']) || title
            }
          : null;
      })
      .filter((image): image is ProductImage => Boolean(image));
  }

  private readSpecs(item: Record<string, unknown>): ProductSpec[] {
    const raw = item['specifications'] ?? item['specs'] ?? item['attributes'] ?? item['productSpecifications'];
    if (Array.isArray(raw)) {
      return raw
        .map((spec) => {
          const record = this.asRecord(spec);
          const label = this.readString(record, [
            'specification',
            'name',
            'label',
            'key',
            'title',
            'specification.name'
          ]);
          const value = this.readString(record, ['value', 'option', 'text', 'specificationValue', 'values.0']);
          return label && value ? { label, value } : null;
        })
        .filter((spec): spec is ProductSpec => Boolean(spec));
    }

    const record = this.asRecord(raw);
    return Object.entries(record)
      .map(([label, value]) => ({ label, value: String(value ?? '') }))
      .filter((spec) => spec.value);
  }

  private readArray(source: unknown): unknown[] {
    if (Array.isArray(source)) return source;

    const object = this.asRecord(source);
    for (const key of ['data', 'result', 'results', 'items', 'categories', 'products', 'resolvedProducts']) {
      const value = object[key];
      if (Array.isArray(value)) return value;
      const nested = this.asRecord(value);
      for (const nestedKey of ['data', 'items', 'categories', 'products', 'resolvedProducts']) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }

    return [];
  }

  private readObject(source: unknown): unknown {
    const object = this.asRecord(source);
    for (const key of ['data', 'result', 'item', 'product']) {
      if (object[key] && !Array.isArray(object[key])) return object[key];
    }
    return source;
  }

  private readString(object: Record<string, unknown>, paths: string[]): string {
    for (const path of paths) {
      const value = this.readPath(object, path);
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return '';
  }

  private readNumber(object: Record<string, unknown>, paths: string[]): number {
    for (const path of paths) {
      const value = this.readPath(object, path);
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  private readBoolean(object: Record<string, unknown>, paths: string[], fallback: boolean): boolean {
    for (const path of paths) {
      const value = this.readPath(object, path);
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (['true', 'available', 'in_stock', 'instock'].includes(normalized)) return true;
        if (['false', 'unavailable', 'out_of_stock', 'outofstock'].includes(normalized)) return false;
      }
    }
    return fallback;
  }

  private readStringArray(object: Record<string, unknown>, paths: string[]): string[] {
    for (const path of paths) {
      const value = this.readPath(object, path);
      if (Array.isArray(value)) {
        return value
          .map((entry) => (typeof entry === 'string' ? entry : this.readString(this.asRecord(entry), ['name', 'title', 'value'])))
          .filter(Boolean);
      }
    }
    return [];
  }

  private readPath(object: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current == null) return undefined;
      if (Array.isArray(current)) return current[Number(key)];
      return this.asRecord(current)[key];
    }, object);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
