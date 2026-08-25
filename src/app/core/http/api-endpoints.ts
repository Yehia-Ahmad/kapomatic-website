export type SupportedLocale = 'ar' | 'en';

const segment = (value: string): string => encodeURIComponent(value.trim());

export const API_ENDPOINTS = {
  generalSettings: '/ecommerce-settings/general',
  storefrontSettings: '/ecommerce-settings/storefront',
  shippingGovernments: '/ecommerce-settings/shipping/governments',
  homePageCategories: '/ecommerce-settings/home-page/categories',
  activeCategories: '/ecommerce-settings/categories/active',
  activeWebsiteImages: '/website-images/active',
  activeWebsiteImagesWithProducts: '/website-images/active-with-products',
  publicHeader: '/header',
  publicHomePage: '/public/home-page',
  publicSearch: '/public/products/search',
  checkout: '/cart/checkout',
  category: (locale: SupportedLocale, slug: string) => `/public/${locale}/categories/${segment(slug)}`,
  categoryProducts: (locale: SupportedLocale, slug: string) =>
    `/public/${locale}/categories/${segment(slug)}/products`,
  product: (locale: SupportedLocale, slug: string) => `/public/${locale}/products/${segment(slug)}`,
  slugAlias: (locale: SupportedLocale, entity: 'category' | 'product', slug: string) =>
    `/public/${locale}/slug-aliases/${entity}/${segment(slug)}`,
  categoryImage: (id: string) => `/public/images/categories/${segment(id)}`,
  productImage: (id: string) => `/public/images/products/${segment(id)}`,
  sitemapPages: '/public/seo/sitemap/pages',
  sitemapCategories: '/public/seo/sitemap/categories',
  sitemapProducts: '/public/seo/sitemap/products',
  sitemapImages: '/public/seo/sitemap/images'
} as const;
