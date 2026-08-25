# SSR and SEO

## Current foundation

Angular 17 `CommonEngine` renders all application routes. Prerender is disabled because catalog slugs and API-backed settings are dynamic. Hydration is enabled; `HttpClient` uses fetch. Settings, header and Home transfer normalized domain state. Raw automatic HTTP response transfer is disabled to avoid serializing permissive backend DTOs alongside the normalized state.

Express responsibilities:

- 308 redirects for `/`, `/cart`, `/checkout`, `/locations`, and listing `/products`, preserving query strings.
- Immutable one-year caching for hashed static assets.
- Per-request runtime API/site/base-href/timeout providers.
- A bounded 502 guard for a relative API prefix that was not intercepted by the required reverse proxy, preventing recursive SSR during degraded/local operation.
- A server-platform HTTP guard that converts relative API calls into normalized `SSR_API_BASE_URL_REQUIRED` failures before Angular's SSR-enabled development server can recursively render `/api`; browser-relative proxy requests and absolute server API origins remain enabled.
- Structural 404 status for unknown URL shapes.
- `no-store` for HTML during foundation development.
- Sanitized 500 response without exception leakage.

Shared `appConfig` owns the required `APP_RUNTIME_CONFIG` provider and uses the normalized browser environment as its safe fallback. `src/main.ts` bootstraps that configuration without a second provider layer. For SSR, `server.ts` supplies a normalized request value through `APP_RUNTIME_CONFIG_OVERRIDE`; the shared factory resolves it into the same public contract. `app.config.server.ts` continues to merge the complete shared configuration with server rendering. This makes the token available during `APP_INITIALIZER` in both platforms while preventing duplicate token declarations or hardcoded service URLs.

SSR deployments that require server-rendered API data must configure an absolute `API_BASE_URL`. A relative `/api` remains valid in the browser behind a reverse proxy, but is intentionally rejected inside the server injector when no absolute origin is available. Settings then use their validated fallback and Home renders its bounded localized recovery state rather than hanging or crashing bootstrap.

Dynamic product/category not-found status is deferred to route data implementation. It must use a single resolved-data pipeline; do not repeat legacy Express preflight plus Angular fetch.

## Runtime configuration names

- `API_BASE_URL`
- `SITE_URL`
- `BASE_HREF`
- `API_REQUEST_TIMEOUT_MS`
- `PORT`
- `TRUST_PROXY`

Values are deployment concerns and are not committed. `SITE_URL` should be authoritative in production; host-header fallback is only a development/degraded behavior.

## SEO service

`SeoService.apply` owns title, description, robots, Open Graph, Twitter, canonical, alternates and JSON-LD. It replaces generated link/script nodes deterministically. Page adapters remain responsible for schema correctness, authoritative money/stock, and localized alternates.

## Home SSR/SEO implementation

- `/ar` and `/en` render localized final Home titles/descriptions, canonical URLs, `ar`, `en`, and Arabic `x-default` alternates, Open Graph locale/content, Twitter metadata, and visible localized content on the server.
- Home emits Organization and WebSite/SearchAction JSON-LD. Only verified settings social URLs and a non-data logo are added; local fixture data URLs and internal API origins are excluded from metadata.
- Home/header TransferState keys include the locale. Server rendering requests `device=desktop` deterministically because the confirmed public DTO does not expose route-safe visibility data; responsive CSS changes geometry without altering hydrated section membership.
- Settled SSR output contains no Home skeleton. A valid empty builder response renders the localized empty state, a malformed root renders a contract error, discarded optional sections retain siblings and emit a partial warning, and upstream failure renders a bounded retry state.
- Home data receives the configured request timeout and no unbounded retry. Explicit user retry starts one fresh composition.

Validation with a local controlled fixture confirmed 200 server-visible Home HTML, correct `lang`/`dir`, metadata/JSON-LD, no raw HTTP DTO duplication, and one server call each to settings, header and Home. With the upstream intentionally offline, `/ar` remained 200 with localized recovery copy and did not leak the origin/connection error. Dynamic entity 404 behavior remains outside this Home scope.

## Required hardening phases

1. Route resolvers return normalized entity + SEO data and communicate 301/404 without duplicate API calls.
2. Cart/checkout are always `noindex,nofollow` and contain no persisted/proof data in SSR HTML.
3. Generate robots and complete paginated sitemaps from deployed public feeds; validate image sitemap namespace/rows.
4. Add Organization, WebSite, Product and Breadcrumb schema tests.
5. Add SSR abort/timeout and degraded-state integration tests.
6. Verify no hydration warnings or duplicate first-load requests in real browsers.
