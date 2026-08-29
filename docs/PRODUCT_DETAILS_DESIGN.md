# Product Details Implementation Design

## Decision and sources

Product Details is designed directly in Angular because Superdesign draft `391f5bc6-b831-4559-aa33-83ac85416572` failed and is not a usable source. The implementation inherits the approved visual family from Home draft `3d6cca6e-3a4b-405d-b2c7-8371074061cc` v3, Category draft `1487e4c1-7a17-4ff8-9a4c-83eeb3967296`, Cart draft `36037094-b766-496d-b984-d16bfd14fb58`, `.superdesign/design-system.md`, and `docs/DESIGN_SYSTEM.md`. Preview commerce data is never copied.

## Visual contract

- Use the existing 75rem storefront container, 16px mobile padding, Cairo stack, off-white canvas, white surfaces, charcoal text and semantic runtime brand tokens.
- Use 14px content/card radii, 10px controls, neutral 1px borders, small card shadows and medium shadow only for the principal product surface.
- Preserve the current shared header/footer proportions, dynamic contained logo and search-first hierarchy.
- Effective price is the strongest numeric value. A struck original price and discount badge appear only when the shared pricing policy validates a real lower effective price.
- Stock uses text plus a selective Font Awesome status icon. No status relies on color alone.
- Primary Add to Cart uses the existing semantic brand fill; secondary gallery and quantity controls use white surfaces and neutral borders. Every action is at least 44px.

## Information architecture

1. Semantic breadcrumb: Home, authoritative category link, current product.
2. Product identity: localized H1, optional short description/brand, and SKU/code in a bidi-isolated line.
3. Two-column purchase region on desktop: gallery and purchase information, with logical RTL/LTR mirroring and balanced `minmax(0, 1.05fr) minmax(20rem, .95fr)` columns.
4. Gallery: stable square image well using `object-fit: contain`; horizontal thumbnail rail; selected state, keyboard activation and image-error fallback.
5. Purchase block: price, availability, quantity and Add to Cart kept together near the top. It is part of the product composition, not a dashboard-style detached card.
6. Below the purchase region: localized description followed by a compact two-column specifications definition list. Aggregate rating is omitted unless both authoritative value and count exist.

## Responsive behavior

- At 320px the order is breadcrumb, identity, gallery, price/stock, quantity/Add, description, specifications.
- The page and grid use `min-width: 0`; long Arabic/English names, codes, values and currency wrap or isolate without document overflow.
- Main media stays within the viewport; thumbnails scroll only inside their own region and never trap keyboard focus.
- Quantity controls form a 44px three-part control. Add to Cart becomes full width on narrow screens.
- Desktop starts at 1024px and mirrors through logical properties rather than duplicating Arabic/English markup.

## Data and state rules

- Render only typed data from `GET /api/public/:lang/products/:productSlug`.
- The confirmed public contract currently supplies one `imageUrl`; the gallery adapter also accepts an authoritative future image array without fabricating additional images.
- Loading uses geometry-matched skeletons. Missing image uses a neutral Font Awesome image fallback.
- Missing product renders a localized not-found state and SSR 404. Network and malformed-contract states are distinct and retryable only where safe.
- Unknown availability, invalid price and out-of-stock states disable purchase. No brand, rating, stock quantity, specification, warranty, shipping or review is inferred.
- Quantity is 1–99; a lower confirmed available quantity becomes the maximum. Add pending, success, failure and maximum states are announced in a polite live region.
- Language switching uses the alternate slug returned by the product translations. Without an alternate slug, it falls back to the target localized Home and never translates a slug heuristically.

## SEO and accessibility

- Apply authoritative localized title/description, canonical and confirmed hreflang. Emit BreadcrumbList plus Product/Offer only from valid product, price, currency and availability data; AggregateRating requires a real rating and count.
- One H1, labelled breadcrumb, meaningful image alt text, keyboard-selectable thumbnails, visible focus, reduced motion, bidi isolation and 44px targets are required.
- SSR renders final product content through normalized TransferState, avoids duplicate hydration fetch, and communicates 301/404 through the request-scoped SSR response state.
