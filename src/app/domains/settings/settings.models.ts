export interface BranchLocation {
  readonly id: string;
  readonly name: string;
  readonly address?: string;
  readonly phone?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly googleMapsUrl?: string;
}

export interface SocialMediaLink {
  readonly id: string;
  readonly name: string;
  readonly link: string;
}

export interface StorefrontSettings {
  readonly mainLogo: string;
  readonly mainColor: string;
  readonly currencyCode: string;
  readonly freeShippingMinimumAmount: number;
  readonly walletPhone: string;
  readonly instapayLink: string;
  readonly storeLocations: readonly BranchLocation[];
  readonly socialMediaLinks: readonly SocialMediaLink[];
}

export interface PersistedStorefrontSettingsV1 {
  readonly version: 1;
  readonly updatedAt: string;
  readonly settings: StorefrontSettings;
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  mainLogo: '',
  mainColor: '#F5B700',
  currencyCode: 'EGP',
  freeShippingMinimumAmount: 0,
  walletPhone: '',
  instapayLink: '',
  storeLocations: [],
  socialMediaLinks: []
};
