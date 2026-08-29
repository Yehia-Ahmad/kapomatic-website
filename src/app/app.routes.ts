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
const categoryPage = () =>
  import('./features/category/category.page').then((module) => module.CategoryPageComponent);
const productDetailsPage = () =>
  import('./features/product-details/product-details.page').then(
    (module) => module.ProductDetailsPageComponent
  );
const cartPage = () => import('./features/cart/cart.page').then((module) => module.CartPageComponent);
const branchLocationsPage = () =>
  import('./features/branches/branch-locations.page').then((module) => module.BranchLocationsPageComponent);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'ar' },

  // Explicit legacy routes must remain before the locale matcher.
  { path: 'cart', pathMatch: 'full', redirectTo: 'ar/cart' },
  { path: 'checkout', pathMatch: 'full', redirectTo: 'ar/checkout' },
  { path: 'branches', pathMatch: 'full', redirectTo: 'ar/branches' },
  { path: 'locations', pathMatch: 'full', redirectTo: 'ar/branches' },
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
            loadComponent: categoryPage,
            data: { pageKey: 'page.category' }
          },
          { path: 'search', loadComponent: foundationPage, data: { pageKey: 'page.search' } },
          {
            path: 'products/:productSlug',
            loadComponent: productDetailsPage,
            data: { pageKey: 'page.product' }
          },
          { path: 'cart', loadComponent: cartPage, data: { pageKey: 'page.cart' } },
          { path: 'checkout', loadComponent: foundationPage, data: { pageKey: 'page.checkout' } },
          {
            path: 'branches',
            loadComponent: branchLocationsPage,
            data: { pageKey: 'page.branches' }
          },
          { path: 'locations', pathMatch: 'full', redirectTo: 'branches' },
          { path: 'not-found', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } },
          { path: '**', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } }
        ]
      }
    ]
  },

  { path: '**', loadComponent: foundationPage, data: { pageKey: 'page.notFound' } }
];
