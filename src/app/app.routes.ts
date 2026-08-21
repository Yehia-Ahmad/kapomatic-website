import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ar'
  },
  {
    path: ':lang',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage)
  },
  {
    path: ':lang/categories/:slug',
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage)
  },
  {
    path: ':lang/search',
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage)
  },
  {
    path: ':lang/products/:slug',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.page').then((m) => m.ProductDetailPage)
  },
  {
    path: ':lang/cart',
    loadComponent: () => import('./pages/cart/cart.page').then((m) => m.CartPage)
  },
  {
    path: ':lang/checkout',
    loadComponent: () => import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage)
  },
  {
    path: ':lang/locations',
    loadComponent: () => import('./pages/locations/locations.page').then((m) => m.LocationsPage)
  },
  {
    path: 'products',
    redirectTo: 'ar/search'
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.page').then((m) => m.ProductDetailPage)
  },
  {
    path: 'cart',
    redirectTo: 'ar/cart'
  },
  {
    path: 'checkout',
    redirectTo: 'ar/checkout'
  },
  {
    path: 'locations',
    redirectTo: 'ar/locations'
  },
  {
    path: '**',
    redirectTo: 'ar'
  }
];
