import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCartPlus,
  faCheck,
  faCircleExclamation,
  faImage,
  faMinus,
  faPlus,
  faRotate,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap
} from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import { ApiUrlBuilder } from '../../core/http/api-url.builder';
import { SupportedLocale } from '../../core/http/api-endpoints';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { SsrResponseService } from '../../core/ssr/ssr-response.service';
import { CartStore } from '../../domains/cart/cart.store';
import { CatalogContractError, CatalogProduct } from '../../domains/catalog/catalog.models';
import { CatalogRepository } from '../../domains/catalog/catalog.repository';
import { formatMoney } from '../../shared/pricing/normalized-price';

type ProductStatus = 'loading' | 'ready' | 'error' | 'malformed' | 'missing';
type AddStatus = 'idle' | 'pending' | 'success' | 'failure' | 'maximum';

type ProductLoadResult =
  | {
      readonly kind: 'loaded';
      readonly product: CatalogProduct;
      readonly requestedSlug: string;
      readonly locale: SupportedLocale;
    }
  | { readonly kind: 'redirect'; readonly location: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'error' };

@Component({
  standalone: true,
  imports: [RouterLink, FaIconComponent],
  templateUrl: './product-details.page.html',
  styleUrl: './product-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailsPageComponent {
  protected readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(CatalogRepository);
  protected readonly cart = inject(CartStore);
  private readonly seo = inject(SeoService);
  private readonly urls = inject(ApiUrlBuilder);
  private readonly ssrResponse = inject(SsrResponseService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly retryRequest = new Subject<void>();

  protected readonly status = signal<ProductStatus>('loading');
  protected readonly product = signal<CatalogProduct | null>(null);
  protected readonly currentImageId = signal('');
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly quantity = signal(1);
  protected readonly addStatus = signal<AddStatus>('idle');
  protected readonly currentImage = computed(() => {
    const product = this.product();
    if (!product) return null;
    return product.images.find((image) => image.id === this.currentImageId()) ?? product.images[0] ?? null;
  });
  protected readonly maximumQuantity = computed(() =>
    Math.max(1, Math.min(99, this.product()?.availableQuantity ?? 99))
  );
  protected readonly canPurchase = computed(() => {
    const product = this.product();
    return product?.availability === 'in-stock' && product.price !== null;
  });
  protected readonly icons = {
    add: faCartPlus,
    check: faCheck,
    error: faCircleExclamation,
    image: faImage,
    minus: faMinus,
    plus: faPlus,
    retry: faRotate,
    star: faStar
  };

  constructor() {
    combineLatest([this.route.paramMap, toObservable(this.locale.locale)])
      .pipe(
        map(([params, locale]) => ({
          locale,
          slug: params.get('productSlug')?.trim() ?? ''
        })),
        distinctUntilChanged((left, right) => left.locale === right.locale && left.slug === right.slug),
        switchMap((request) =>
          this.retryRequest.pipe(
            map(() => true),
            startWith(false),
            switchMap((force) => {
              this.status.set('loading');
              return this.load(request.locale, request.slug, force);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => this.applyResult(result));
  }

  protected money(amount: number): string {
    return formatMoney(amount, this.product()?.price?.currency ?? 'EGP', this.locale.locale());
  }

  protected selectImage(imageId: string): void {
    this.currentImageId.set(imageId);
  }

  protected moveImage(currentIndex: number, step: number): void {
    const images = this.product()?.images ?? [];
    if (images.length < 2) return;
    const target = (currentIndex + step + images.length) % images.length;
    const image = images[target];
    if (image) this.selectImage(image.id);
  }

  protected imageFailed(imageId: string): void {
    this.failedImages.update((images) => new Set(images).add(imageId));
  }

  protected decrement(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
    this.addStatus.set('idle');
  }

  protected increment(): void {
    if (this.quantity() >= this.maximumQuantity()) {
      this.addStatus.set('maximum');
      this.cart.announce(this.locale.translate('product.maximumQuantity'));
      return;
    }
    this.quantity.update((value) => value + 1);
    this.addStatus.set('idle');
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product || !product.price || !this.canPurchase()) {
      this.addStatus.set('failure');
      this.cart.announce(this.locale.translate('product.addFailed'));
      return;
    }
    const existingQuantity = this.cart.lines().find((line) => line.productId === product.id)?.quantity ?? 0;
    if (existingQuantity >= this.maximumQuantity()) {
      this.addStatus.set('maximum');
      this.cart.announce(this.locale.translate('product.maximumQuantity'));
      return;
    }
    this.addStatus.set('pending');
    queueMicrotask(() => {
      const added = this.cart.add(
        product.id,
        {
          name: product.name,
          imageUrl: product.images[0]?.url ?? '',
          unitPrice: product.price?.effective ?? 0,
          currency: product.price?.currency ?? 'EGP',
          slug: product.slug,
          alternateSlugs: product.alternateSlugs,
          shortDescription: product.shortDescription
        },
        {
          quantity: this.quantity(),
          availability: product.availability,
          maximumQuantity: product.availableQuantity
        }
      );
      this.addStatus.set(added ? 'success' : 'failure');
      this.cart.announce(
        added
          ? this.locale.interpolate('product.addedQuantity', {
              count: this.quantity(),
              name: product.name
            })
          : this.locale.translate('product.addFailed')
      );
    });
  }

  protected retry(): void {
    this.retryRequest.next();
  }

  private load(locale: SupportedLocale, slug: string, force: boolean): Observable<ProductLoadResult> {
    return this.repository.loadProduct(locale, slug, { force }).pipe(
      map((product) => ({ kind: 'loaded' as const, product, requestedSlug: slug, locale })),
      catchError((error: unknown) => {
        if (error instanceof CatalogContractError) return of({ kind: 'malformed' as const });
        if (!(error instanceof ApiError) || error.status !== 404) return of({ kind: 'error' as const });
        return this.repository.resolveAlias(locale, 'product', slug).pipe(
          map((alias) => ({ kind: 'redirect' as const, location: alias.location })),
          catchError(() => of({ kind: 'missing' as const }))
        );
      })
    );
  }

  private applyResult(result: ProductLoadResult): void {
    if (result.kind === 'redirect') {
      this.ssrResponse.redirect(result.location);
      if (this.isBrowser) void this.router.navigateByUrl(result.location, { replaceUrl: true });
      return;
    }
    if (result.kind === 'missing') {
      this.status.set('missing');
      this.ssrResponse.notFound();
      this.applyFallbackSeo();
      return;
    }
    if (result.kind === 'malformed' || result.kind === 'error') {
      this.status.set(result.kind);
      this.applyFallbackSeo();
      return;
    }
    if (result.product.slug !== result.requestedSlug) {
      const location = `/${result.locale}/products/${encodeURIComponent(result.product.slug)}`;
      this.ssrResponse.redirect(location);
      if (this.isBrowser) void this.router.navigateByUrl(location, { replaceUrl: true });
      return;
    }
    this.product.set(result.product);
    this.currentImageId.set(result.product.images[0]?.id ?? '');
    this.failedImages.set(new Set());
    this.quantity.set(1);
    this.addStatus.set('idle');
    this.locale.setAlternateSlugs(result.product.alternateSlugs);
    this.status.set('ready');
    this.applySeo(result.product);
  }

  private applySeo(product: CatalogProduct): void {
    const locale = this.locale.locale();
    const path = `/${locale}/products/${encodeURIComponent(product.slug)}`;
    const breadcrumbItems: Record<string, unknown>[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: this.locale.translate('nav.home'),
        item: this.urls.site(`/${locale}`)
      }
    ];
    if (product.category) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: product.category.name,
        item: this.urls.site(`/${locale}/categories/${encodeURIComponent(product.category.slug)}`)
      });
    }
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: product.name,
      item: this.urls.site(path)
    });
    const productSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      url: this.urls.site(path)
    };
    if (product.description) productSchema['description'] = product.description;
    if (product.code) productSchema['sku'] = product.code;
    if (product.images.length > 0) productSchema['image'] = product.images.map((image) => image.url);
    if (product.price && product.availability !== 'unknown') {
      productSchema['offers'] = {
        '@type': 'Offer',
        price: product.price.effective,
        priceCurrency: product.price.currency,
        availability:
          product.availability === 'in-stock'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: this.urls.site(path)
      };
    }
    if (product.rating !== null && product.reviewCount !== null) {
      productSchema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount
      };
    }
    this.seo.apply({
      title: product.seo.title || `${product.name} | ${this.locale.translate('app.brandName')}`,
      description: product.seo.description || product.description || product.shortDescription,
      path: product.seo.canonicalPath || path,
      locale,
      robots: product.seo.robots,
      type: 'product',
      alternatePaths: product.seo.alternatePaths,
      imageUrl: product.images[0]?.url,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbItems
        },
        productSchema
      ]
    });
  }

  private applyFallbackSeo(): void {
    const locale = this.locale.locale();
    this.seo.apply({
      title: this.locale.translate('product.detailsErrorTitle'),
      description: this.locale.translate('product.detailsErrorDescription'),
      path: this.router.url.split('?')[0] ?? `/${locale}`,
      locale,
      robots: 'noindex,follow'
    });
  }
}
