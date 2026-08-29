# Public API Contracts

## Evidence and contract status

Two read-only Postman collections were found and parsed:

1. `/home/yehia_ahmed/Desktop/kapomatic-backend/kapomatic-warehouse.postman_collection.json` — 104 requests; contains localized category/product/search, slug-alias, public image and sitemap contracts.
2. `/home/yehia_ahmed/Desktop/ecommerce-backend/kapomatic-warehouse.postman_collection.json` — 132 requests; contains newer public header, dynamic Home Page Builder and bundle contracts.

They have different checksums and represent divergent backend feature sets. **Needs Verification:** whether production deploys one combined backend, one branch, or separate services. No production origin or collection variable value is copied here. The client uses one configurable API base and must not assume both collections are deployed until smoke-tested.

The Postman operations have no saved response examples. Response shapes below are either **Code-confirmed** from the read-only backend source or **Needs Verification** where only frontend compatibility code exists.

## Endpoint matrix

| Operation                     | Method and path                                                        | Parameters/body                                                   | Response evidence                                                                                             | Rebuild owner              |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------- |
| General storefront settings   | `GET /ecommerce-settings/general`                                      | none                                                              | Direct object: logo/color/locations/social/wallet/InstaPay plus currency/free-shipping fields; Code-confirmed | settings domain            |
| Visible per-category settings | `GET /ecommerce-settings/storefront`                                   | none                                                              | Direct array; Code-confirmed                                                                                  | catalog adapters           |
| Shipping governments          | `GET /ecommerce-settings/shipping/governments`                         | none                                                              | fee list + free-shipping minimum; Code-confirmed                                                              | checkout adapter           |
| Header                        | `GET /header`                                                          | none                                                              | `{success,data:{settings,navigation,actions}}`; Code-confirmed in newer backend                               | implemented header domain  |
| Dynamic Home                  | `GET /public/home-page`                                                | `device=desktop` during SSR/hydration; `locale` is ar/en          | `{success,data:{sections}}`; Code-confirmed in newer backend                                                  | implemented Home domain    |
| Home Browse Categories        | `GET /public/:lang/categories/home`                                    | `lang=ar\|en`; `limit=12`                                         | `{success,data:{categories}}`; Code-confirmed; live deployment returned 404 on 2026-08-28                     | Home Categories domain     |
| Legacy Home selection         | `GET /ecommerce-settings/home-page/categories`                         | none                                                              | selected category IDs/objects; Code-confirmed in older backend                                                | compatibility adapter only |
| Legacy active categories      | `GET /ecommerce-settings/categories/active`                            | none                                                              | active category/settings/products rows; Code-confirmed in older backend                                       | compatibility adapter only |
| Legacy Home promotions        | `GET /website-images/active-with-products`                             | none                                                              | active promotion rows with products; wrapper aliases isolated in adapter                                      | compatibility adapter only |
| Category                      | `GET /public/:lang/categories/:slug`                                   | localized slug                                                    | category, alternates and SEO; Code-confirmed in localized backend                                             | catalog domain             |
| Category products             | `GET /public/:lang/categories/:slug/products`                          | `page`, `limit`, `sort`; filter extension Needs Verification      | localized products + pagination                                                                               | catalog domain             |
| Unified search                | `GET /public/products/search`                                          | `q`, `page`, `limit`                                              | language-independent matching across Arabic/English fields                                                    | search domain              |
| Product                       | `GET /public/:lang/products/:slug`                                     | localized slug                                                    | product, price/availability, alternates and SEO                                                               | catalog domain             |
| Slug alias                    | `GET /public/:lang/slug-aliases/:entity/:slug`                         | entity is `category` or `product`                                 | redirect payload for available old slug                                                                       | route resolver             |
| Public images                 | `GET /public/images/categories/:id`; `GET /public/images/products/:id` | entity ID                                                         | image bytes                                                                                                   | image URL adapter          |
| Promotion images              | `GET /website-images/active`                                           | none                                                              | active campaigns; exact wrapper Needs Verification                                                            | promotions domain          |
| Promotion resolution          | `GET /website-images/:id/products`                                     | image ID                                                          | resolved products                                                                                             | promotions domain          |
| Bundles                       | `GET /bundles`; `GET /bundles/:slug`                                   | page/limit or slug                                                | newer backend only                                                                                            | catalog/bundle domain      |
| Checkout                      | `POST /cart/checkout`                                                  | customer, shipping, payment, products; newer backend also bundles | pending website order                                                                                         | checkout domain            |
| Sitemap feeds                 | `GET /public/seo/sitemap/:feed`                                        | feed is pages/categories/products/images; paginated entity feed   | localized sitemap rows                                                                                        | SSR SEO generator          |

All paths are appended to the configured base by `ApiUrlBuilder`; callers must not concatenate origins.

## Current settings contract

The Phase 1 settings adapter accepts direct, `{data}`, or `{result}` top-level wrappers only at this isolated boundary. It normalizes:

```ts
interface StorefrontSettings {
  mainLogo: string;
  mainColor: string;
  currencyCode: string;
  freeShippingMinimumAmount: number;
  walletPhone: string;
  instapayLink: string;
  storeLocations: StoreLocation[];
  socialMediaLinks: SocialMediaLink[];
}
```

Invalid colors, protocols, currency values, negative thresholds, and malformed nested entries are rejected or replaced by stable fallbacks. Raw untyped objects do not escape the normalizer.

## Implemented Home and header contracts

### Header

`HeaderStore.load(locale)` calls `GET /header`. `normalizeHeaderResponse` localizes structured `ar`/`en` strings, validates color and URLs, limits nested navigation depth, and discards unsafe entries. The public response can supply enabled/sticky/top-bar/search/cart/language/mobile-menu flags, desktop/mobile logo, contact, navigation, and actions. General settings provide the logo only when the header-specific logo is absent. When the optional header capability returns 404/501, the store reads `GET /public/seo/sitemap/categories?limit=100` and builds category children from authoritative localized paths and titles; failure of that fallback returns the neutral Home/catalog/locations navigation.

### Dynamic Home

The first request is:

```http
GET /public/home-page?device=desktop&locale=ar|en
```

The adapter requires an array at `data.sections`. Supported allowlisted types are `marquee`, `offers_slider`, `categories`, `products`, `bundles`, and `features_bar`. It preserves backend order and stable IDs. Each type has a dedicated normalized shape; malformed optional sections are discarded and produce a non-sensitive `HOME_SECTION_DISCARDED` issue. A malformed root is an error, never an empty Home.

Confirmed normalized fields include localized title/subtitle/content/name/slug/alt text, collection columns and view-all behavior, active slides and link configuration, category/product/bundle IDs and images, product code, retail/sale price, discount, inventory, and feature content. URLs pass the public-link/image allowlist. The application does not expose raw DTOs to templates.

**Needs Verification:** the deployed newer backend and localized backend features may not coexist. Current backend models expose many business strings as flat values even though the client can consume localized objects. No machine translation occurs; flat content is displayed only through the adapter's explicit value handling.

### Home Browse Categories

The Browse Categories region has a dedicated localized request independent of embedded category rows in the dynamic/legacy Home payload:

```http
GET /public/ar/categories/home?limit=12
GET /public/en/categories/home?limit=12
```

The raw DTO is `{success:true,data:{categories:[{id,name,slug,localizedSlugs,image,productsCount}]}}`. `normalizeHomeCategoriesResponse` requires a valid success envelope, array, unique non-empty IDs, localized name, active slug, localized-slug object and finite non-negative numeric `productsCount`. It never derives a slug from a name and never turns a malformed contract into an authoritative empty list. Missing alternate slugs remain absent in the normalized `localizedSlugs` model.

`productsCount` is displayed directly from this aggregate response. The Angular client does not calculate it from Home products and does not issue a Product request per Category. Image URLs pass through `ApiUrlBuilder.image()`; unsafe sources become the stable missing-image state, while missing and failed images use the existing Category fallback without exposing a broken browser image.

The section owns localized loading, loaded, valid-empty, request-error, malformed-contract, refresh and Retry states. A successful result is stored as normalized locale-keyed TransferState (`kapomatic-home-categories-v1-ar|en`) and consumed once by the browser. The current deployed production origin returned HTTP 404 with the old Category-detail response on both localized Home Categories paths on 2026-08-28, so deployment of the code-confirmed backend route remains required.

### Fallback precedence

Legacy negotiation occurs only when the dynamic Home call returns HTTP 404 or 501. The compatibility branch combines the three older content endpoints and the localized category/product sitemap indexes. Explicit configured category order and selected products are respected. Selected category rows are merged with the richer active-category translations, while sitemap entries provide canonical slugs when legacy rows omit them. Products without a localized slug use the backend-supported ID lookup only as a resolver; Product Details redirects when the public response supplies a different canonical slug. Sitemap failures are non-fatal, while a normal dynamic-Home 5xx, timeout, permission failure, or malformed contract remains a visible error.

### Public images

The localized API currently returns product `imageUrl` values such as `https://kapomatic.com/api/public/images/products/:id`; that storefront URL redirects to HTML in the deployed topology. Category payloads also contain the historic `categorys` spelling even though the confirmed byte endpoint is `/public/images/categories/:id`. `ApiUrlBuilder.image()` is the single normalization boundary: it maps confirmed public entity-image paths through the configured API base, corrects `categorys`, avoids duplicate `/api`, preserves unrelated absolute HTTPS/CDN URLs, accepts only configured/local development HTTP URLs, validates allowlisted raster data-URL MIME types, and rejects unsafe schemes. Catalog, Home and Cart restoration all use this boundary; templates do not concatenate image URLs.

### Transfer and caching

Normalized Home, Home Categories and header results are stored in locale-keyed `TransferState`. The browser consumes and removes these entries rather than re-fetching them during initial hydration. Automatic raw `HttpClient` transfer caching is disabled. No Home retry/backoff or persistent Home cache is implemented; the retry action performs one fresh GET composition. The settings store performs one intentional non-blocking browser revalidation after using SSR or validated cache data.

## Checkout compatibility contract

Both collections confirm that product `price` is accepted from the browser. The newer collection additionally supports `bundles`, whose bundle price/stock is backend-calculated. Current product request shape:

```json
{
  "customerName": "string",
  "customerPhone": "string",
  "government": "string",
  "shippingLocation": "string",
  "paymentMethod": "cash | wallet | instapay",
  "transferPhone": "string when conditional",
  "transferImage": "data:image/... when conditional",
  "products": [{ "productId": "string", "price": 0, "quantity": 1 }]
}
```

`price` is a temporary legacy compatibility field, never authoritative storefront state. See `BACKEND_CONTRACT_CHANGES.md`.

## Client policy

- Default timeout is 10 seconds and can be overridden by request context.
- HTTP failures become `ApiError` with kind, status, stable code, retryability, correlation ID and structured validation errors.
- UI must map stable codes to localized copy; raw backend messages are not customer copy.
- Retry only idempotent reads and only with an explicit bounded policy.
- Runtime schema/adapters live beside their domain client; legacy aliases must not spread into page components.
- DTO contract tests and deployed smoke tests are required before feature implementation.
