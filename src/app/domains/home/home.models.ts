import { SupportedLocale } from '../../core/http/api-endpoints';

export type HomeContentSource = 'dynamic-builder' | 'legacy-confirmed';
export type HomeIssueKind = 'request' | 'contract';

export interface HomeCapabilityFlags {
  readonly dynamicBuilder: boolean;
  readonly legacyCategories: boolean;
  readonly legacyPromotions: boolean;
  readonly bundles: boolean;
}

export interface HomeContentIssue {
  readonly region: 'page' | 'categories' | 'promotions';
  readonly kind: HomeIssueKind;
  readonly code: string;
  readonly retryable: boolean;
}

export interface HomeCategory {
  readonly id: string;
  readonly name: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly slug: string;
}

export type ProductAvailability = 'in-stock' | 'out-of-stock' | 'unknown';

export interface HomePrice {
  readonly regular: number;
  readonly sale: number | null;
  readonly discountPercentage: number;
}

export interface HomeProduct {
  readonly kind: 'product';
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly code: string;
  readonly slug: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly price: HomePrice | null;
  readonly availability: ProductAvailability;
  readonly availableQuantity: number | null;
}

export interface HomeBundle {
  readonly kind: 'bundle';
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly price: HomePrice | null;
  readonly availability: ProductAvailability;
}

export interface HomeSectionBase {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly fullWidth: boolean;
  readonly backgroundColor: string;
}

export interface HomeCollectionSettings {
  readonly layout: 'grid' | 'carousel';
  readonly columns: { readonly desktop: number; readonly tablet: number; readonly mobile: number };
  readonly viewAllUrl: string;
  readonly viewAllLabel: string;
}

export type HomeSection =
  | (HomeSectionBase & {
      readonly type: 'categories';
      readonly categories: readonly HomeCategory[];
      readonly settings: HomeCollectionSettings;
    })
  | (HomeSectionBase & {
      readonly type: 'products';
      readonly products: readonly HomeProduct[];
      readonly settings: HomeCollectionSettings;
    })
  | (HomeSectionBase & {
      readonly type: 'bundles';
      readonly bundles: readonly HomeBundle[];
      readonly settings: HomeCollectionSettings;
    })
  | (HomeSectionBase & {
      readonly type: 'offers_slider';
      readonly slides: readonly HomeOfferSlide[];
      readonly settings: HomeSliderSettings;
    })
  | (HomeSectionBase & {
      readonly type: 'marquee';
      readonly items: readonly HomeTextLink[];
      readonly backgroundColor: string;
      readonly textColor: string;
    })
  | (HomeSectionBase & {
      readonly type: 'features_bar';
      readonly items: readonly HomeFeature[];
    });

export interface HomeOfferSlide {
  readonly id: string;
  readonly desktopImageUrl: string;
  readonly mobileImageUrl: string;
  readonly altText: string;
  readonly title: string;
  readonly subtitle: string;
  readonly linkUrl: string;
  readonly external: boolean;
  readonly openInNewTab: boolean;
  readonly buttonLabel: string;
}

export interface HomeSliderSettings {
  readonly autoplay: boolean;
  readonly autoplayDelayMs: number;
  readonly loop: boolean;
  readonly pauseOnHover: boolean;
  readonly showNavigation: boolean;
  readonly showPagination: boolean;
  readonly imageFit: 'cover' | 'contain';
}

export interface HomeTextLink {
  readonly id: string;
  readonly text: string;
  readonly linkUrl: string;
  readonly external: boolean;
  readonly openInNewTab: boolean;
}

export interface HomeFeature extends HomeTextLink {
  readonly description: string;
  readonly iconUrl: string;
}

export interface HomePageContent {
  readonly locale: SupportedLocale;
  readonly source: HomeContentSource;
  readonly sections: readonly HomeSection[];
  readonly issues: readonly HomeContentIssue[];
  readonly capabilities: HomeCapabilityFlags;
}

export class HomeContractError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'HomeContractError';
  }
}
