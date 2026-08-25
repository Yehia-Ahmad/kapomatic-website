# Kapomatic Storefront Rebuild

Angular 17 rebuild of the public Kapomatic automotive ecommerce storefront. This repository is the writable rebuild. The legacy Angular 21 storefront and backend repositories are reference-only.

## Current status

The Angular 17 foundation, shared storefront shell, and backend-driven Home page are implemented. Home follows approved Superdesign draft `3d6cca6e-3a4b-405d-b2c7-8371074061cc`, version 3. Category, search-results, product-details, cart, checkout, and locations routes intentionally remain foundation placeholders pending separate review and approval.

Implemented:

- Angular 17 standalone architecture with strict TypeScript.
- Angular SSR, hydration, `HttpClient` with `fetch`, request timeout normalization, and TransferState.
- Explicit `ar|en` locale routing, legacy route ordering, and a dedicated not-found route.
- Bilingual translation catalogue and SSR-safe document language/direction.
- Backend-authoritative storefront settings with a validated, versioned browser cache fallback.
- Dynamic semantic theme tokens derived from a validated backend primary color.
- Tailwind CSS 3.4.17, SCSS tokens, and selective Font Awesome packages.
- SEO metadata/canonical/hreflang/JSON-LD foundation.
- Dynamic public header, desktop navigation, accessible mobile drawer, footer, search routing, optional WhatsApp entry, and contained backend logo.
- Typed dynamic Home Page Builder adapter with an explicit 404/501-only compatibility fallback to the confirmed older Home endpoints.
- Ordered marquee, responsive promotion carousel, category, product, bundle-capability, and feature-bar rendering with regional contract isolation.
- Versioned SSR-safe cart shell state used for Home add-to-cart and header count; the full cart experience is not implemented.
- Home loading, empty, malformed-partial, recoverable-error, missing-image, and out-of-stock behavior.
- Localized Home SSR metadata and Organization/WebSite/SearchAction JSON-LD from verified settings only.
- ESLint, Prettier, Karma/Jasmine tests, type-checking, and production bundle budgets.

## Requirements

- Node.js `20.20.2` (`.nvmrc`); Angular 17 supports the pinned Node 20 line.
- npm 10.x; the repository declares `npm@10.8.2`.
- A same-origin `/api` reverse proxy, or SSR runtime values described in `docs/DEPLOYMENT.md`.

## Commands

| Task                           | Command                |
| ------------------------------ | ---------------------- |
| Install                        | `npm install`          |
| Develop                        | `npm start`            |
| Type-check                     | `npm run typecheck`    |
| Lint                           | `npm run lint`         |
| Unit tests                     | `npm run test:ci`      |
| Production browser + SSR build | `npm run build`        |
| Serve built SSR application    | `npm run serve:ssr`    |
| Check formatting               | `npm run format:check` |

## Documentation

- [Rebuild specification](PROJECT_REBUILD_SPECIFICATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Required backend changes](docs/BACKEND_CONTRACT_CHANGES.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Localization](docs/LOCALIZATION.md)
- [SSR and SEO](docs/SSR_AND_SEO.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Rebuild progress](docs/REBUILD_PROGRESS.md)

Do not add page UI until the corresponding Superdesign draft is approved. Do not copy legacy implementation or assets without an explicit compatibility or licensing decision.

Home validation screenshots are fixture-driven because a deployed API origin was not supplied:

- [Arabic desktop](docs/screenshots/home-ar-desktop-fixture.png)
- [Arabic 320px](docs/screenshots/home-ar-mobile-320-fixture.png)
- [English desktop](docs/screenshots/home-en-desktop-fixture.png)
- [English 320px](docs/screenshots/home-en-mobile-320-fixture.png)

The fixtures were validation-only and are not part of production source or runtime paths. Do not implement another storefront feature until the current Home screenshots are reviewed.
