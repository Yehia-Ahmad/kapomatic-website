# Rebuild Progress

## Current run

| Phase                    | Status                                      | Completed                                                                                                                                                                      | Verification                                                                                                                                                       | Unresolved decisions                                                                       | Next safe step                                                        |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 0 — Discovery and safety | Complete                                    | Resolved writable Angular 17 path, read-only Angular 21 legacy, divergent backend/Postman sources and pre-existing Git changes                                                 | Recursive inventories and relevant legacy/backend source verification                                                                                              | Which backend branch/feature set is deployed                                               | Contract smoke tests with an authorized non-production API            |
| 1 — Foundation           | Complete                                    | Strict Angular 17, pinned tools, Tailwind, selective Font Awesome, route/i18n/SSR/HTTP/settings/theme/SEO primitives                                                           | Strict checks, 10 original tests, browser+SSR build and route/status smoke tests                                                                                   | Font asset/license, deployed origins, legacy redirects, analytics policy                   | Preserve foundation boundaries                                        |
| 2 — Superdesign          | Home approved; additional generation waived | Approved bilingual Home v3 (`3d6cca6e-3a4b-405d-b2c7-8371074061cc`) and design system retained as immutable visual source                                                      | Draft/version and direct-authored provenance confirmed from resume; user accepted the credit limitation and authorized page-by-page implementation without retries | Later pages still require individual review/authorization                                  | Do not generate or replace Home v3                                    |
| 3 — Shell and Home       | Implemented; awaiting screenshot review     | Shared shell, dynamic header/navigation/logo/theme, accessible mobile drawer, footer, language/search/cart/contact entry, backend-driven Home sections/states and Home SSR/SEO | Unit/component tests, strict checks, browser+SSR build, 1440/768/true-320 review, fixture variants, upstream-offline and route-status smoke checks                 | Deployed API combination/localized content, font asset, production imagery/origin, E2E/axe | Review the four Home screenshots before authorizing Category Products |
| 4+ — Customer journey    | Not started                                 | Localized routes remain foundation placeholders; no category/search/product/cart/checkout/locations page UI was added                                                          | Route/status smoke only                                                                                                                                            | Page-specific business/API decisions remain open                                           | Wait for explicit approval                                            |

## Safety record

- Writable: `/home/yehia_ahmed/Desktop/kapomatic-website-frontend`.
- Read-only legacy: `/home/yehia_ahmed/Desktop/ecommerce-website`.
- Read-only API evidence: both backend/Postman directories.
- Legacy repository had unrelated uncommitted Home Page Builder changes before this run; none were modified.
- No commit was created.
- Superdesign canvas: <https://superdesign.dev/teams/88de58c5-d9aa-47f5-953f-f27bf39cb6df/projects/cad6319c-8787-4813-8f8d-c968aa2d4ba6>.
- Home preview: <https://p.superdesign.dev/draft/3d6cca6e-3a4b-405d-b2c7-8371074061cc>.
- The requested model-backed `replace` was attempted with the selected Pro model and one free-model retry; both were blocked by the Superdesign credit gate. Per the skill fallback, v3 was imported into the same draft as a revertible direct-authored correction. No branch or project recreation occurred.
- Home v3 was explicitly approved as the rebuild's visual foundation on 2026-08-23. Its direct-authored/imported provenance remains intentionally disclosed; the approved draft must not be rerun or replaced.
- The remaining customer-journey design plan remains documentation-only. The user accepted insufficient credits and explicitly instructed that no further Superdesign generation be attempted. No drafts were created or replaced during this implementation run.
- Home and the shared storefront shell are now implemented. Category Products, Search Results, Product Details, Cart Experience, Checkout, Locations and other customer-journey pages remain unimplemented placeholders.

## Current limitations

- Every route except localized Home remains a temporary approval-gate placeholder, not storefront UI.
- `/products/:legacyId` awaits a confirmed ID/slug resolution contract.
- Entity-level SSR 404/301, robots, sitemap and full schema are later SEO work.
- No E2E framework is selected yet.
- Visual evidence uses controlled development fixtures because no deployed API origin was authorized. Production contract coexistence and real content remain **Needs Verification**.
- Full cart authority/repricing, cart page/drawer, catalog/search/product resolvers, checkout, location detail/map, entity SEO statuses, robots and sitemap remain later phases.
- `npm audit --omit=dev` reports 11 production findings (10 high, 1 critical), primarily in the fixed Angular 17 framework/SSR line. The separately fixable PostCSS finding was resolved with 8.5.26. The remaining findings are a deployment blocker pending an approved version decision and mitigation plan; no forced framework upgrade was performed.
