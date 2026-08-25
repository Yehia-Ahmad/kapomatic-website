import { routes } from './app.routes';
import { localeMatcher } from './core/routing/locale.matcher';
import { HomePageComponent } from './features/home/home.page';

describe('application routes', () => {
  it('redirects the root to Arabic and keeps legacy redirects before the locale matcher', () => {
    expect(routes[0]).toEqual(jasmine.objectContaining({ path: '', redirectTo: 'ar', pathMatch: 'full' }));
    const matcherIndex = routes.findIndex((route) => route.matcher === localeMatcher);
    expect(routes.findIndex((route) => route.path === 'cart')).toBeLessThan(matcherIndex);
    expect(routes.findIndex((route) => route.path === 'products/:legacyId')).toBeLessThan(matcherIndex);
  });

  it('uses the real Home page for both accepted localized roots and placeholders for later pages', async () => {
    const localized = routes.find((route) => route.matcher === localeMatcher);
    const shell = localized?.children?.[0];
    const home = shell?.children?.find((route) => route.path === '' && route.pathMatch === 'full');
    const cart = shell?.children?.find((route) => route.path === 'cart');

    expect(home?.loadComponent).toBeDefined();
    expect(await home?.loadComponent?.()).toBe(HomePageComponent);
    expect(cart?.loadComponent).toBeDefined();
    expect(cart?.data?.['pageKey']).toBe('page.cart');
  });
});
