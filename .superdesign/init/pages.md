# Page Dependency Trees

All target routes currently share the same temporary page because product UI is gated on design approval.

## `/ar` and `/en` — Home design target

Entry: `src/app/features/foundation/foundation-placeholder.page.ts` (temporary only)

Dependencies:

- `src/app/features/foundation/foundation-placeholder.page.ts`
  - `src/app/core/i18n/locale.service.ts`
    - `src/app/core/i18n/translations.ts`
    - `src/app/core/http/api-endpoints.ts`
- `src/app/app.component.ts`
  - `src/app/app.component.html`
  - `src/app/app.component.scss`
  - `src/app/core/i18n/locale.service.ts`
- `src/app/app.routes.ts`
  - `src/app/core/routing/locale.matcher.ts`
- `src/styles.scss`
- `tailwind.config.js`

Design context must also include `.superdesign/design-system.md` and the relevant Home/design sections of `PROJECT_REBUILD_SPECIFICATION.md`. The temporary placeholder is not a visual source to reproduce.

## Other localized routes

`/:lang/categories/:categorySlug`, `/:lang/search`, `/:lang/products/:productSlug`, `/:lang/cart`, `/:lang/checkout`, `/:lang/locations`, and not-found currently resolve to the same dependency tree. Their real page dependencies will be regenerated after approved feature implementation.
