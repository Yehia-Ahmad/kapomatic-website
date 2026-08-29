import { normalizePublicRouteIndex, publicRouteSlugMap } from './public-route-index';

describe('public localized route index', () => {
  it('extracts authoritative localized slugs and IDs from sitemap contracts', () => {
    const entries = normalizePublicRouteIndex(
      {
        data: [
          {
            loc: 'https://kapomatic.com/en/categories/transmission-filters',
            language: 'en',
            alternates: {
              ar: 'https://kapomatic.com/ar/categories/فلاتر-فتيس',
              en: 'https://kapomatic.com/en/categories/transmission-filters'
            },
            image: {
              loc: 'https://kapomatic.com/api/public/images/categorys/category-1',
              title: 'Transmission Filters'
            }
          }
        ]
      },
      'category',
      'en'
    );

    expect(entries).toEqual([
      {
        id: 'category-1',
        label: 'Transmission Filters',
        slug: 'transmission-filters',
        path: '/en/categories/transmission-filters',
        alternateSlugs: { ar: 'فلاتر-فتيس', en: 'transmission-filters' }
      }
    ]);
    expect(publicRouteSlugMap(entries)).toEqual({ 'category-1': 'transmission-filters' });
  });

  it('rejects a route for the wrong locale or collection', () => {
    expect(
      normalizePublicRouteIndex(
        {
          data: [
            {
              loc: 'https://kapomatic.com/ar/products/product',
              image: {
                loc: 'https://kapomatic.com/api/public/images/products/product-1',
                title: 'Product'
              }
            }
          ]
        },
        'category',
        'ar'
      )
    ).toEqual([]);
  });
});
