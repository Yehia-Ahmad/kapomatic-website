# Localization

## Decision

The rebuild uses a typed in-repository translation catalogue for application copy and localized public API fields for business content. This is compatible with Angular 17 SSR and supports runtime language switching without separate builds. If content volume later requires a translation platform, preserve the typed key boundary.

## Locale contract

- Supported locales: `ar`, `en` only.
- Default: Arabic; `/` permanently redirects to `/ar` at the current foundation stage.
- Arabic uses `lang="ar" dir="rtl"`; English uses `lang="en" dir="ltr"`.
- `LocaleService` derives locale from the URL on server and browser; it does not use browser preference during SSR.
- Every visible label, validation/state message and ARIA name must use a translation key.
- Currency and numbers must use `Intl.NumberFormat` with `ar-EG` or `en-EG` when commerce UI begins.
- API names/descriptions are never machine-translated or guessed.
- Shell, Home controls, state copy, live cart announcements, carousel labels, SEO description and accessibility names use the typed catalogue in `src/app/core/i18n/translations.ts`.
- Dynamic Home/header strings are localized by the adapters when the API supplies structured locale values. Flat backend values are displayed as supplied; their translation completeness is **Needs Verification**.

## URL switching

Language switching preserves query parameters and fragments. Category/product features must pass the backend-provided alternate slug to `switchLocale`; an English slug must never be produced from Arabic text heuristically. If no alternate exists, the UI must explain unavailability or navigate to the equivalent listing according to an approved product rule.

## SEO

Canonical uses the active localized route. `hreflang` is emitted only for confirmed alternates, with Arabic as `x-default` unless product approves another default. SSR HTML must contain final localized metadata and matching visible content.

## Acceptance tests

- Locale matcher rejects `fr`, `products`, and arbitrary first segments.
- Same route renders stable direction on SSR and after hydration.
- Switches retain relevant `q`, filter, sort and page parameters.
- Every production template passes an untranslated-copy review in both directions.
- Mixed numbers, phone strings, prices and icons have explicit bidi behavior.

## Implemented Home behavior

- Locale change reloads header and Home with the target locale and updates `html[lang]`/`html[dir]` through the route-derived service.
- Home search routes to the same localized `/:lang/search?q=...` contract after trimming/collapsing whitespace; an empty query does not navigate.
- Currency uses `Intl.NumberFormat` with `ar-EG` or `en-EG`; product codes are isolated with `dir="ltr"` and mixed price/currency output uses `bdi`.
- Directional chevrons and carousel keyboard semantics account for direction. Drawer placement uses logical inline-end behavior in both locales.
- Home canonical and visible language are server-derived from the route; browser language preference does not alter SSR output.

**Needs Verification:** the newer Home Builder accepts a locale query, but the inspected backend schema contains several flat content fields. Content editors/backend owners must confirm Arabic/English population and alternate slugs before the category/product phases.
