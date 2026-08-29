# Testing Strategy

## Current tooling

- Karma 6 + Jasmine 5 + ChromeHeadless for Angular unit/component tests.
- Angular strict template compiler and `tsc --noEmit` for type safety.
- Angular ESLint 17.5 for TypeScript/template accessibility rules.
- Prettier check for deterministic formatting.

Current tests cover the foundation plus public URL safety, dynamic Home/legacy adapters, capability negotiation, header normalization, search submission, mobile-drawer dialog behavior, cart versioning/merge/corruption, semantic color behavior and settings normalization.

The customer-journey suite additionally covers catalog DTO normalization, API-aware image URLs, localized sitemap route extraction, Home slug enrichment, Category/Product repository URLs, pricing, Cart migration/revalidation and the shared header/category fallback.

## Release test layers

| Layer         | Required coverage                                                                            |
| ------------- | -------------------------------------------------------------------------------------------- |
| Pure unit     | money/pricing, DTO adapters, validators, URL construction, theme contrast, translations      |
| Service       | HTTP request shape, timeouts/errors, TransferState, cache corruption/migration, cancellation |
| Component     | keyboard/focus, states, responsive inputs, translated ARIA, dialogs/carousels                |
| Route         | locale constraints, legacy ordering, alias redirects, query state, 404/301/200               |
| SSR           | final metadata, statuses, no browser APIs, no duplicate request, hydration stability         |
| Contract      | Postman/backend fixture compatibility and secure checkout migration                          |
| E2E           | browse/search/product/cart/checkout/location in Arabic and English                           |
| Accessibility | automated axe plus keyboard and screen-reader manual checks                                  |
| Visual        | approved Superdesign comparison at mobile/tablet/desktop                                     |

## Commands and gates

Pull requests must pass `npm run typecheck`, `npm run lint`, `npm run test:ci`, `npm run format:check`, and `npm run build`. A browser E2E framework will be selected before feature-page release; none is claimed in Phase 1.

WCAG 2.2 AA cannot be claimed from automated tests alone.

## Phase 1 validation record — 2026-08-22

- `npm run format:check`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test:ci`: 10/10 tests passed in ChromeHeadless 151.
- `npm run build`: passed for browser and Node SSR output; browser initial bundle is 267.74 kB raw / 75.27 kB estimated transfer.
- Built SSR smoke test: `/` returned 308 to `/ar`, `/ar` returned 200, an invalid structural path returned 404, and an unproxied relative API request returned the bounded 502 fail-safe. The requests completed without the recursive SSR delay found and corrected during validation.
- `npm audit --omit=dev`: failed the security gate with 11 production dependency findings (10 high, 1 critical), inherited from the required Angular 17 framework line and its compatible Font Awesome integration. The separately fixable PostCSS finding was removed by updating to 8.5.26. No automatic or forced framework upgrade was applied because it would violate the fixed Angular 17 scope.

## Shell and Home validation record — 2026-08-23

- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test:ci`, `npm run build`, and `git diff --check` are the completion gates. The final counts/results below must match the final command run rather than an intermediate build.
- Final gates passed: 44/44 ChromeHeadless tests; production browser+SSR build with no warnings; initial browser total 335.22 kB raw / 92.92 kB estimated transfer; lazy storefront shell 68.11/17.91 kB and Home 47.32/11.53 kB.
- Dynamic/legacy Home tests confirm stable ordering, localized field selection, pricing/stock normalization, optional malformed-section omission, unsafe-image rejection, deterministic locale/device query parameters, fallback on 404/501, and no fallback on normal 5xx.
- Header/drawer/cart tests cover safe localized links, neutral fallback, normalized search, empty-search prevention, named modal, initial focus, Escape, body scroll lock, in-drawer language access, duplicate cart merge, versioned persistence and invalid-data cleanup.
- SSR fixture smoke checks: `/ar` and `/en` returned 200 with final server-visible data; `/` returned 308 to `/ar`; invalid localized structure returned 404; `/ar/cart` returned the scoped placeholder; the unproxied `/api` fail-safe returned 502.
- Degraded-state checks: missing logo retained neutral stable geometry; absent promotions omitted the carousel; malformed category data kept product siblings and showed a non-sensitive partial warning; long English copy had no 320px overflow; complete upstream failure produced localized retry UI without raw network details.
- Browser review used the real built SSR application, a controlled local API fixture, and true DevTools device emulation. Arabic and English both measured `clientWidth = scrollWidth = 320`, zero failed images, zero settled skeletons and no loaded-state Home error. A 768px tablet render was also inspected.
- Fixture-driven screenshots: `docs/screenshots/home-ar-desktop-fixture.png`, `home-ar-mobile-320-fixture.png`, `home-en-desktop-fixture.png`, and `home-en-mobile-320-fixture.png`. No fixture is part of production source.
- Automated axe, screen-reader, real deployed API, and network-level duplicate-request instrumentation remain **Not Implemented**; WCAG compliance and production contract compatibility are not claimed.

## Runtime-configuration startup regression — 2026-08-23

- Injector tests construct the real browser `appConfig`, resolve `APP_RUNTIME_CONFIG` and `ApiUrlBuilder`, then execute the configured initializer with the real `StorefrontSettingsStore` and a controlled `HttpClient`. The expected settings URL is `/api/ecommerce-settings/general` and startup reaches `ready` without `NullInjectorError`.
- The merged server configuration is constructed with a request-level `APP_RUNTIME_CONFIG_OVERRIDE`; the shared token resolves the normalized override and produces the expected absolute public API URL in the isolated test.
- Platform-interceptor tests prove that a server-relative `/api` request becomes a retryable normalized 502 without reaching the HTTP backend, while the identical relative request remains available to the browser proxy.
- Built runtime checks: `/` returned 308 to `/ar`; SSR `/ar` and `/en` returned 200; hydrated Chrome reported Angular 17.3.12, the correct `lang`/`dir`, a rendered `#main-content`, no DI error text, and the designed localized degraded state while the backend/reverse proxy was unavailable.
- The SSR-enabled Angular development server also returned `/ar` and `/en` in the degraded state without recursion or injector errors after adding the server-relative API guard.

## Image and localized-navigation integration regression — 2026-08-26

- `npm run typecheck`, `npm run lint`, `npm run test:ci` (70/70), production browser+SSR build and `git diff --check` passed.
- Live API inspection confirmed that the storefront-host product image URL returned HTML after redirect, while the normalized configured-API URL returned `200 image/jpeg`; the corrected category endpoint also returned `200 image/jpeg`.
- Built SSR emitted configured-API product image sources, canonical Arabic/English Product and Category links, and 301 redirects from supported ID resolver URLs to localized slugs. Arabic Home category/view-all links were checked for single encoding.
- The isolated Chrome journey verified Home category/product links, shared category navigation, Category product links, Cart image loading, Cart image/name navigation, persistence after refresh, Arabic/English alternate slugs and Cart locale switching. All settled pages reported zero broken images, zero hydration errors and no console errors.
- Evidence: `docs/screenshots/customer-journey-visual-qa.json` and the `*-real.png` Category/Product/Cart/Drawer screenshots in the same directory.

## Public Home Categories integration — 2026-08-28

- Final gates passed: `format:check`, `typecheck`, `lint`, 89/89 ChromeHeadless tests, production browser+SSR build and `git diff --check`. The build emitted no warnings; current browser initial total is 363.50 kB raw / 97.57 kB estimated transfer and the Home lazy chunk is 58.33/13.14 kB.
- Unit/component coverage validates the exact Arabic/English URL with `limit=12`, no duplicate `/api`, DTO-to-domain mapping, preserved alternate slugs, authoritative counts, unsafe/missing/failed image handling, whole-card localized RouterLinks, missing-slug defense, retained Home image/name settings, loading/empty/network/malformed/Retry states, no per-Category Product calls and no hydration repeat after successful TransferState.
- The built SSR fixture returned 200 for `/ar` and `/en`, emitted `kapomatic-home-categories-v1-ar|en`, rendered `92 منتج` / `92 products`, and emitted the localized Category routes. A real hydrated Chrome run recorded exactly one `GET /api/public/ar/categories/home?limit=12`; the expected image request also succeeded.
- CDP responsive inspection at 320, 375, 768, 1024 and 1440 px in Arabic and English found `clientWidth === scrollWidth`, loaded images, correct localized links/counts and card touch areas larger than 44 px.
- Loaded-state screenshots use an isolated contract fixture because the production deployment returned 404 for the new endpoint. The fixture uses the real currently public Category record/image and is not present in production source: `home-categories-ar-desktop-contract-fixture.png`, `home-categories-ar-mobile-320-contract-fixture.png`, `home-categories-en-desktop-contract-fixture.png`, and `home-categories-en-mobile-320-contract-fixture.png`.
- Live production-backed SSR still returned 200 for `/ar`, `/en`, `/ar/categories/فلاتر-فتيس` and `/en/categories/transmission-filters`; Home exposed the localized recoverable Categories error rather than misreporting the undeployed 404 as an empty response.
