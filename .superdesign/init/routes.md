# Routes

| URL                               | Component                                    | Layout         | Status                              |
| --------------------------------- | -------------------------------------------- | -------------- | ----------------------------------- | --- |
| `/`                               | redirect                                     | Express/Router | 308/redirect to `/ar`               |
| `/:lang`                          | temporary foundation placeholder             | root app shell | Home design target; `lang` only `ar | en` |
| `/:lang/categories/:categorySlug` | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/search`                   | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/products/:productSlug`    | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/cart`                     | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/checkout`                 | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/locations`                | temporary foundation placeholder             | root app shell | UI not implemented                  |
| `/:lang/not-found`                | temporary foundation placeholder             | root app shell | UI not implemented                  |
| legacy unlocalized paths          | explicit redirect/placeholder before matcher | root app shell | compatibility skeleton              |
| wildcard                          | temporary not-found placeholder              | root app shell | Express structural 404              |

## `src/app/app.routes.ts`

```ts
import { Routes } from '@angular/router';
import { localeMatcher } from './core/routing/locale.matcher';

const foundationPage = () =>
  import('./features/foundation/foundation-placeholder.page').then(
    (module) => module.FoundationPlaceholderPageComponent
  );

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ar' },
  { path: 'cart', pathMatch: 'full', redirectTo: 'ar/cart' },
  { path: 'checkout', pathMatch: 'full', redirectTo: 'ar/checkout' },
  { path: 'locations', pathMatch: 'full', redirectTo: 'ar/locations' },
  { path: 'products', pathMatch: 'full', redirectTo: 'ar/search' },
  {
    path: 'products/:legacyId',
    loadComponent: foundationPage,
    data: { pageKey: 'page.legacyProduct', legacyRoute: true }
  },
  {
    matcher: localeMatcher,
    children: [
      { path: '', pathMatch: 'full', loadComponent: foundationPage, data: { pageKey: 'page.home' } },
      {
        path: 'categories/:categorySlug',
        loadComponent: foundationPage,
        data: { pageKey: 'page.category' }
      },
      { path: 'search', loadComponent: foundationPage, data: { pageKey: 'page.search' } },
      {
        path: 'products/:productSlug',
        loadComponent: foundationPage,
        data: { pageKey: 'page.product' }
      },
      { path: 'cart', loadComponent: foundationPage, data: { pageKey: 'page.cart' } },
      { path: 'checkout', loadComponent: foundationPage, data: { pageKey: 'page.checkout' } },
      { path: 'locations', loadComponent: foundationPage, data: { pageKey: 'page.locations' } },
      { path: 'not-found', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } },
      { path: '**', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } }
    ]
  },
  { path: '**', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } }
];
```

## `src/app/core/routing/locale.matcher.ts`

```ts
import { UrlMatcher, UrlSegment } from '@angular/router';

export const localeMatcher: UrlMatcher = (segments) => {
  const locale = segments[0]?.path;
  if (locale !== 'ar' && locale !== 'en') return null;
  return {
    consumed: [segments[0] as UrlSegment],
    posParams: { lang: segments[0] as UrlSegment }
  };
};
```
