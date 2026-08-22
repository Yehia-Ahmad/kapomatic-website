import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { BackendSeo } from './seo.service';
import { LanguageCode, UrlService } from './url.service';

export type ProductSpec = {
  label: string;
  value: string;
};

export type ProductImage = {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export type EcommerceProduct = {
  id: string;
  slug?: string;
  code?: string;
  sku?: string;
  categoryId?: string;
  categorySlug?: string;
  categoryTitle?: string;
  title: string;
  subTitle: string;
  description?: string;
  brand: string;
  price: number;
  retailPrice: number;
  discountPercentage: number | null;
  priceAfterDiscount: number | null;
  hasDiscount: boolean;
  currency: string;
  rating: number;
  reviewsCount: number;
  imageSrc: string;
  imageAlt?: string;
  images: ProductImage[];
  inventoryCount?: number;
  inStock: boolean;
  shippingNote: string;
  specs: ProductSpec[];
  seo?: BackendSeo;
  alternateSlugs?: Partial<Record<LanguageCode, string>>;
};

export type EcommerceCategory = {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  description?: string;
  imageSrc: string;
  imageAlt?: string;
  products: EcommerceProduct[];
  seo?: BackendSeo;
  alternateSlugs?: Partial<Record<LanguageCode, string>>;
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

export type ProductPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ProductPageResult = {
  products: EcommerceProduct[];
  pagination: ProductPagination;
  seo?: BackendSeo;
};

export type ProductSortKey = 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc';

export type HomePageCategory = EcommerceCategory & {
  products: EcommerceProduct[];
};

export interface PublicApiEnvelope<T> {
  data: T;
  seo?: BackendSeo;
}

export interface PublicCategoryResponse {
  category: EcommerceCategory;
  seo?: BackendSeo;
}

export interface PublicProductResponse {
  product: EcommerceProduct;
  seo?: BackendSeo;
}

export interface SlugAliasResult {
  redirectTo: string;
  statusCode: 301;
}

@Injectable({ providedIn: 'root' })
export class EcommerceService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly urls = inject(UrlService);
  private readonly apiBaseUrl = environment.api_base_url;
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private activeCategories$?: Observable<EcommerceCategory[]>;
  private homePageCategories$?: Observable<HomePageCategory[]>;

  getPublicCategoryBySlug(language: LanguageCode, slug: string): Observable<PublicCategoryResponse> {
    if (!this.urls.apiConfigured()) {
      return of({ category: { id: '', slug, title: '', subtitle: '', imageSrc: '', products: [] } });
    }
    const key = makeStateKey<PublicCategoryResponse>(`public-category:${language}:${slug}`);
    return this.withTransferState(
      key,
      this.http.get<unknown>(this.apiUrl(`public/${language}/categories/${encodeURIComponent(slug)}`)).pipe(
        map((response) => {
          const envelope = this.envelope(response);
          return {
            category: this.mapCategory(envelope.data),
            seo: envelope.seo
          };
        })
      )
    );
  }

  getPublicCategoryProductsBySlug(
    language: LanguageCode,
    slug: string,
    filters: SpecificationFilter[] = [],
    page = 1,
    limit = 12,
    sort: ProductSortKey = 'relevance'
  ): Observable<ProductPageResult> {
    if (!this.urls.apiConfigured()) return of(this.emptyProductPage(page, limit));
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (sort !== 'relevance') params = params.set('sort', sort);
    for (const filter of filters) {
      if (!filter.specification || !filter.value) continue;
      params = params.append('specification', filter.specification).append('value', filter.value);
    }

    const key = makeStateKey<ProductPageResult>(
      `public-category-products:${language}:${slug}:${page}:${limit}:${sort}:${JSON.stringify(filters)}`
    );
    return this.withTransferState(
      key,
      this.http
        .get<unknown>(this.apiUrl(`public/${language}/categories/${encodeURIComponent(slug)}/products`), { params })
        .pipe(map((response) => this.mapProductPageResult(response, undefined, page, limit)))
    );
  }

  getPublicProductBySlug(language: LanguageCode, slug: string): Observable<PublicProductResponse> {
    if (!this.urls.apiConfigured()) return of({ product: this.emptyProduct(slug, '') });
    const key = makeStateKey<PublicProductResponse>(`public-product:${language}:${slug}`);
    return this.withTransferState(
      key,
      this.http.get<unknown>(this.apiUrl(`public/${language}/products/${encodeURIComponent(slug)}`)).pipe(
        map((response) => {
          const envelope = this.envelope(response);
          return {
            product: this.mapProduct(envelope.data),
            seo: envelope.seo
          };
        })
      )
    );
  }

  searchPublicProducts(language: LanguageCode, q: string, page = 1, limit = 12): Observable<ProductPageResult> {
    if (!this.urls.apiConfigured()) return of(this.emptyProductPage(page, limit));
    if (!q.trim()) {
      return of(this.emptyProductPage(page, limit));
    }

    const params = new HttpParams().set('q', q.trim()).set('page', String(page)).set('limit', String(limit));
    const key = makeStateKey<ProductPageResult>(`public-search:${language}:${q.trim()}:${page}:${limit}`);
    return this.withTransferState(
      key,
      this.http
        .get<unknown>(this.apiUrl('public/products/search'), { params })
        .pipe(map((response) => this.mapProductPageResult(response, undefined, page, limit, language)))
    );
  }

  resolveSlugAlias(
    language: LanguageCode,
    entityType: 'category' | 'product',
    oldSlug: string
  ): Observable<SlugAliasResult | null> {
    return this.http
      .get<unknown>(
        this.apiUrl(`public/${language}/slug-aliases/${entityType}/${encodeURIComponent(oldSlug)}`)
      )
      .pipe(
        map((response) => {
          const item = this.asRecord(this.readObject(response));
          const redirectTo = this.readString(item, ['redirectTo', 'url', 'location', 'canonicalUrl']);
          return redirectTo ? { redirectTo, statusCode: 301 as const } : null;
        }),
        catchError(() => of(null))
      );
  }

  getActiveCategoriesWithProductsAndSettings(): Observable<EcommerceCategory[]> {
    if (!this.urls.apiConfigured()) return of([]);
    this.activeCategories$ ??= this.withTransferState(
      makeStateKey<EcommerceCategory[]>('active-categories-with-products'),
      this.serverTimeout(
        this.http
        .get<unknown>(this.apiUrl('ecommerce-settings/categories/active'))
          .pipe(map((response) => this.readArray(response).map((category) => this.mapCategory(category))))
      )
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.activeCategories$;
  }

  getHomePageCategories(): Observable<HomePageCategory[]> {
    if (!this.urls.apiConfigured()) return of([]);
    this.homePageCategories$ ??= this.withTransferState(
      makeStateKey<HomePageCategory[]>('home-page-categories'),
      this.http.get<unknown>(this.apiUrl('ecommerce-settings/home-page/categories')).pipe(
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
      )
    ).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.homePageCategories$;
  }

  getProductsByActiveCategory(
    categoryId: string,
    filters: SpecificationFilter[] = []
  ): Observable<EcommerceProduct[]> {
    return this.getProductsByActiveCategoryPage(categoryId, filters).pipe(map((result) => result.products));
  }

  getProductsByActiveCategoryPage(
    categoryId: string,
    filters: SpecificationFilter[] = [],
    page = 1,
    limit = 12,
    sort: ProductSortKey = 'relevance'
  ): Observable<ProductPageResult> {
    if (!this.urls.apiConfigured()) return of(this.emptyProductPage(page, limit));
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (sort !== 'relevance') params = params.set('sort', sort);

    for (const filter of filters) {
      if (!filter.specification || !filter.value) continue;
      params = params.append('specification', filter.specification).append('value', filter.value);
    }

    return this.http
      .get<unknown>(this.apiUrl(`ecommerce-settings/categories/active/${categoryId}/products`), {
        params
      })
      .pipe(map((response) => this.mapProductPageResult(response, categoryId, page, limit)));
  }

  searchActiveProducts(q: string, page = 1, limit = 12): Observable<ProductPageResult> {
    if (!this.urls.apiConfigured()) return of(this.emptyProductPage(page, limit));
    if (!q.trim()) {
      return of(this.emptyProductPage(page, limit));
    }

    const params = new HttpParams().set('q', q.trim()).set('page', String(page)).set('limit', String(limit));

    return this.http
      .get<unknown>(this.apiUrl('public/products/search'), { params })
      .pipe(map((response) => this.mapProductPageResult(response, undefined, page, limit)));
  }

  getCategoryFilters(categoryId: string): Observable<CategoryFiltersResult> {
    if (!this.urls.apiConfigured()) return of({ filters: [], products: [] });
    return this.http
      .get<unknown>(this.apiUrl(`ecommerce-settings/categories/${categoryId}/filters`))
      .pipe(map((response) => this.mapCategoryFiltersResult(response, categoryId)));
  }

  getProductByActiveCategory(categoryId: string, productId: string): Observable<EcommerceProduct> {
    if (!this.urls.apiConfigured()) return of(this.emptyProduct(productId, categoryId));
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
    return this.urls.apiUrl(path);
  }

  private emptyProductPage(page: number, limit: number): ProductPageResult {
    return {
      products: [],
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: page > 1
      }
    };
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
    const translations = this.asRecord(item['translations']);
    const ar = this.asRecord(translations['ar']);
    const en = this.asRecord(translations['en']);
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
      slug: this.readString(item, ['slug']) || this.readString(ar, ['slug']) || this.readString(en, ['slug']),
      title: title || 'قسم',
      subtitle: this.readString(item, ['shortDescription', 'description', 'subtitle', 'category.description']),
      description: this.readString(item, ['description', 'longDescription', 'category.description']),
      imageSrc: this.readString(item, ['image', 'imageUrl', 'imageSrc', 'photo', 'category.image', 'category.imageUrl']),
      imageAlt: this.readString(item, ['imageAlt']) || title || 'قسم',
      products,
      seo: this.readSeo(item['seo']),
      alternateSlugs: this.readAlternateSlugs(item)
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

  private mapProductPageResult(
    source: unknown,
    categoryId: string | undefined,
    requestedPage: number,
    requestedLimit: number,
    language?: LanguageCode
  ): ProductPageResult {
    const envelope = this.envelope(source);
    const products = this.readArray(envelope.data ?? source).map((product) => this.mapProduct(product, categoryId, language));
    const object = this.asRecord(this.readObject(source));
    const paginationSource = this.asRecord(object['pagination']);
    const page = this.readNumber(paginationSource, ['page']) || requestedPage;
    const limit = this.readNumber(paginationSource, ['limit']) || requestedLimit;
    const totalItems = this.readNumber(paginationSource, ['totalItems', 'total', 'count']) || products.length;
    const totalPages =
      this.readNumber(paginationSource, ['totalPages', 'pages']) || Math.max(1, Math.ceil(totalItems / limit));

    return {
      products,
      seo: envelope.seo,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: this.readBoolean(paginationSource, ['hasNextPage'], page < totalPages),
        hasPrevPage: this.readBoolean(paginationSource, ['hasPrevPage'], page > 1)
      }
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
      slug: productId,
      categoryId,
      title: '',
      subTitle: '',
      brand: '',
      price: 0,
      retailPrice: 0,
      discountPercentage: null,
      priceAfterDiscount: null,
      hasDiscount: false,
      currency: 'EGP',
      rating: 0,
      reviewsCount: 0,
      imageSrc: '',
      imageAlt: '',
      images: [],
      inventoryCount: 0,
      inStock: false,
      shippingNote: '',
      specs: []
    };
  }

  private mapProduct(source: unknown, categoryId?: string, language?: LanguageCode): EcommerceProduct {
    const item = this.asRecord(source);
    const product = this.asRecord(item['product']);
    const translations = this.asRecord(item['translations'] ?? product['translations']);
    const ar = this.asRecord(translations['ar']);
    const en = this.asRecord(translations['en']);
    const id = this.readString(item, ['id', '_id', 'productId', 'product.id', 'product._id']);
    const preferredTranslation = language ? this.asRecord(translations[language]) : {};
    const fallbackTranslation = language === 'en' ? ar : en;
    const title =
      this.readString(preferredTranslation, ['name']) ||
      this.readString(fallbackTranslation, ['name']) ||
      this.readString(item, ['name', 'title', 'productName', 'product.name', 'product.title']);
    const images = this.readImages(item, title);
    const specs = this.readSpecs(item);
    const price = this.readNumber(item, ['price', 'salePrice', 'retailPrice', 'regularPrice', 'ecommercePrice']);
    const retailPrice = this.readNumber(item, ['retailPrice', 'price', 'salePrice', 'regularPrice', 'ecommercePrice']);
    const discountPercentage = this.readOptionalNumber(item, ['discountPercentage']);
    const priceAfterDiscount = this.readOptionalNumber(item, ['priceAfterDiscount']);
    const hasDiscount = discountPercentage !== null && discountPercentage > 0 && priceAfterDiscount !== null;
    const inventoryCount = this.readOptionalNumber(item, ['inventoryCount', 'stock', 'availableQuantity']);

    return {
      id,
      slug:
        this.readString(preferredTranslation, ['slug']) ||
        this.readString(fallbackTranslation, ['slug']) ||
        this.readString(item, ['slug']) ||
        this.readString(ar, ['slug']) ||
        this.readString(en, ['slug']) ||
        id,
      code: this.readString(item, ['code', 'sku', 'product.code', 'product.sku']),
      sku: this.readString(item, ['sku', 'code', 'product.sku', 'product.code']),
      categoryId:
        categoryId ||
        this.readString(item, ['categoryId', 'category', 'category.id', 'category._id', 'categoryId._id', 'categoryId.id']),
      categorySlug: this.readString(item, ['categorySlug', 'category.slug', 'category.translations.ar.slug', 'category.translations.en.slug']),
      categoryTitle: this.readString(item, ['categoryTitle', 'categoryName', 'category.name', 'category.title']),
      title: title || 'منتج',
      subTitle:
        this.readString(preferredTranslation, ['shortDescription']) ||
        this.readString(fallbackTranslation, ['shortDescription']) ||
        this.readString(item, ['subTitle', 'subtitle', 'description', 'shortDescription']),
      description:
        this.readString(preferredTranslation, ['description']) ||
        this.readString(fallbackTranslation, ['description']) ||
        this.readString(item, ['description', 'longDescription']),
      brand: this.readString(item, ['brand', 'brand.name', 'manufacturer', 'manufacturer.name']),
      price,
      retailPrice,
      discountPercentage,
      priceAfterDiscount,
      hasDiscount,
      currency: this.readString(item, ['currency', 'currencyCode']) || 'EGP',
      rating: this.readNumber(item, ['rating', 'averageRating', 'reviewsSummary.rating']),
      reviewsCount: this.readNumber(item, ['reviewsCount', 'reviewCount', 'reviewsSummary.count']),
      imageSrc: images[0]?.src || '',
      imageAlt: images[0]?.alt || title || 'منتج',
      images,
      inventoryCount: inventoryCount ?? undefined,
      inStock:
        inventoryCount !== null
          ? inventoryCount > 0
          : this.readBoolean(item, ['inStock', 'isAvailable', 'available', 'stockStatus'], true),
      shippingNote: this.readString(item, ['shippingNote', 'deliveryNote']),
      specs,
      seo: this.readSeo(item['seo']),
      alternateSlugs: this.readAlternateSlugs(item)
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
      .map<ProductImage | null>((image, index) => {
        const record = this.asRecord(image);
        const src =
          typeof image === 'string'
            ? image
            : this.readString(record, ['url', 'src', 'image', 'imageUrl', 'path', 'secure_url']);

        if (!src) return null;

        const result: ProductImage = {
          id: this.readString(record, ['id', '_id']) || `img-${index + 1}`,
          src,
          alt: this.readString(record, ['alt', 'imageAlt', 'name', 'title']) || title
        };
        const width = this.readOptionalNumber(record, ['width']);
        const height = this.readOptionalNumber(record, ['height']);
        if (width !== null) result.width = width;
        if (height !== null) result.height = height;
        return result;
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

  private envelope(source: unknown): PublicApiEnvelope<unknown> {
    const root = this.asRecord(source);
    const data = root['data'] ?? root['result'] ?? root['item'] ?? root['category'] ?? root['product'] ?? source;
    return {
      data,
      seo: this.readSeo(root['seo'])
    };
  }

  private readSeo(source: unknown): BackendSeo | undefined {
    const item = this.asRecord(source);
    if (Object.keys(item).length === 0) return undefined;
    return {
      metaTitle: this.readString(item, ['metaTitle', 'title']),
      title: this.readString(item, ['title']),
      metaDescription: this.readString(item, ['metaDescription', 'description']),
      description: this.readString(item, ['description']),
      keywords: this.readStringArray(item, ['keywords']),
      robots: this.readString(item, ['robots']),
      robotsIndex: this.readOptionalBoolean(item, ['robotsIndex', 'index']),
      robotsFollow: this.readOptionalBoolean(item, ['robotsFollow', 'follow']),
      ogTitle: this.readString(item, ['ogTitle']),
      ogDescription: this.readString(item, ['ogDescription']),
      ogImage: this.readString(item, ['ogImage']),
      twitterTitle: this.readString(item, ['twitterTitle']),
      twitterDescription: this.readString(item, ['twitterDescription']),
      twitterImage: this.readString(item, ['twitterImage'])
    };
  }

  private readAlternateSlugs(item: Record<string, unknown>): Partial<Record<LanguageCode, string>> {
    const alternates = this.asRecord(item['alternateSlugs'] ?? item['alternates']);
    const translations = this.asRecord(item['translations']);
    return {
      ar:
        this.readString(alternates, ['ar', 'ar.slug', 'arSlug']) ||
        this.readString(this.asRecord(translations['ar']), ['slug']) ||
        undefined,
      en:
        this.readString(alternates, ['en', 'en.slug', 'enSlug']) ||
        this.readString(this.asRecord(translations['en']), ['slug']) ||
        undefined
    };
  }

  private readOptionalBoolean(object: Record<string, unknown>, paths: string[]): boolean | undefined {
    for (const path of paths) {
      const value = this.readPath(object, path);
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (['true', 'yes', '1'].includes(normalized)) return true;
        if (['false', 'no', '0'].includes(normalized)) return false;
      }
    }
    return undefined;
  }

  private withTransferState<T>(key: ReturnType<typeof makeStateKey<T>>, request: Observable<T>): Observable<T> {
    if (this.transferState.hasKey(key)) {
      const value = this.transferState.get(key, null as T | null);
      this.transferState.remove(key);
      return of(value as T);
    }

    return request.pipe(
      map((value) => {
        if (!this.isBrowser) this.transferState.set(key, value);
        return value;
      })
    );
  }

  private serverTimeout<T>(request: Observable<T>, milliseconds = 3500): Observable<T> {
    return this.isBrowser ? request : request.pipe(timeout({ first: milliseconds }));
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

  private readOptionalNumber(object: Record<string, unknown>, paths: string[]): number | null {
    for (const path of paths) {
      const value = this.readPath(object, path);
      if (value === null || value === undefined || value === '') continue;
      const number = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
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
