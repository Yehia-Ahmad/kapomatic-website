# Build and Deployment

## Artifact

`npm run build` creates browser and Node SSR output in `dist/kapomatic-website-frontend-v17`. Run the server entry with `npm run serve:ssr`.

## Runtime

- Node 20.20.2 is pinned in `.nvmrc`; deploy a compatible Node 20 runtime.
- npm 10.8.2 is declared for reproducible installs.
- Use `npm ci` in CI after lockfile review.
- The SSR process listens on `PORT` (default 4000).

## Configuration

| Variable                 | Purpose                           | Required production decision                                          |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------- |
| `API_BASE_URL`           | Public API prefix/origin          | Prefer same-origin reverse proxy; never expose admin endpoints/tokens |
| `SITE_URL`               | Canonical HTTPS storefront origin | Required for production SEO                                           |
| `BASE_HREF`              | Mounted path                      | Default `/`; test any subpath deployment                              |
| `API_REQUEST_TIMEOUT_MS` | SSR/client public API timeout     | Default 10 seconds; recommended 5–10 seconds after measurement        |
| `PORT`                   | Node listener                     | Platform-defined                                                      |
| `TRUST_PROXY`            | Honor one trusted proxy hop       | Enable only behind a configured trusted proxy                         |

## Reverse proxy and security

- Terminate HTTPS and set forwarded headers only at trusted infrastructure.
- Proxy `/api` to the public backend or configure an allowlisted HTTPS API origin and CORS.
- When a relative API base reaches the Node SSR process instead of the reverse proxy, the server returns a bounded `502 API_PROXY_NOT_CONFIGURED` response. This prevents recursive SSR; it is a fail-safe, not an API proxy implementation.
- Add CSP after inventorying API, image, map and approved analytics domains.
- Do not cache cart/checkout HTML or responses containing customer data.
- Cache hashed assets immutably; define separate policies for API images, sitemap, robots and HTML.
- Rate-limit checkout and proof upload at the backend.
- **Release blocker:** the 2026-08-22 production audit reports 11 findings (10 high, 1 critical), including Angular 17 SSR/security advisories. Production deployment requires an approved framework-version exception with compensating controls or a business-approved Angular upgrade; `npm audit fix --force` must not be used as an unreviewed migration.

## Post-deployment checks

1. `/` returns 308 to `/ar`; invalid locale/path returns 404.
2. Arabic and English HTML have correct `lang`, `dir`, title and canonical.
3. Settings/logo/theme render during SSR and hydrate without flicker.
4. API failures resolve to bounded degraded states; SSR does not hang.
5. Browser and SSR bundles load without console/hydration errors.
6. Robots/sitemaps, structured data and share previews validate after their implementation phase.
7. Checkout contract and idempotency capability are verified before accepting real orders.
