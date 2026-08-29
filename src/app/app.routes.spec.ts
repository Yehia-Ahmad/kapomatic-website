import { routes } from './app.routes';
import { localeMatcher } from './core/routing/locale.matcher';
import { CartPageComponent } from './features/cart/cart.page';
import { CategoryPageComponent } from './features/category/category.page';
import { HomePageComponent } from './features/home/home.page';
import { ProductDetailsPageComponent } from './features/product-details/product-details.page';
import { BranchLocationsPageComponent } from './features/branches/branch-locations.page';
import { SearchPageComponent } from './features/search/search.page';

describe('application routes', () => {
  it('redirects the root to Arabic and keeps legacy redirects before the locale matcher', () => {
    expect(routes[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'ar', pathMatch: 'full' }));
    const matcherIndex = routes.findIndex((route) => route.matcher === localeMatcher);
    expect(routes.findIndex((route) => route.path === 'cart')).toBeLessThan(matcherIndex);
    expect(routes.findIndex((route) => route.path === 'products/:legacyId')).toBeLessThan(matcherIndex);
  });

  it('loads real Home, Category, Search, Product, Cart and Branch components under the localized shell', async () => {
    const localized = routes.find((route) => route.matcher === localeMatcher);
    const shell = localized?.children?.[0];
    const home = shell?.children?.find((route) => route.path === '' && route.pathMatch === 'full');
    const category = shell?.children?.find((route) => route.path === 'categories/:categorySlug');
    const search = shell?.children?.find((route) => route.path === 'search');
    const product = shell?.children?.find((route) => route.path === 'products/:productSlug');
    const cart = shell?.children?.find((route) => route.path === 'cart');
    const branches = shell?.children?.find((route) => route.path === 'branches');
    const legacyLocations = shell?.children?.find((route) => route.path === 'locations');

    expect(await home?.loadComponent?.()).toBe(HomePageComponent);
    expect(await category?.loadComponent?.()).toBe(CategoryPageComponent);
    expect(await search?.loadComponent?.()).toBe(SearchPageComponent);
    expect(await product?.loadComponent?.()).toBe(ProductDetailsPageComponent);
    expect(await cart?.loadComponent?.()).toBe(CartPageComponent);
    expect(await branches?.loadComponent?.()).toBe(BranchLocationsPageComponent);
    expect(legacyLocations).toEqual(jasmine.objectContaining({ pathMatch: 'full', redirectTo: 'branches' }));
  });
});
