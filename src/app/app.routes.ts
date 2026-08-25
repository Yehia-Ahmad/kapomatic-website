import { Routes } from '@angular/router';
import { localeMatcher } from './core/routing/locale.matcher';

const foundationPage = () =>
  import('./features/foundation/foundation-placeholder.page').then(
    (module) => module.FoundationPlaceholderPageComponent
  );

const storefrontShell = () =>
  import('./layout/storefront-shell/storefront-shell.component').then(
    (module) => module.StorefrontShellComponent
  );

const homePage = () => import('./features/home/home.page').then((module) => module.HomePageComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ar' },

  // Explicit legacy routes must remain before the locale matcher.
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
      {
        path: '',
        loadComponent: storefrontShell,
        children: [
          { path: '', pathMatch: 'full', loadComponent: homePage, data: { pageKey: 'page.home' } },
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
      }
    ]
  },

  { path: '**', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } }
];
