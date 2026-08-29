import {
  filterQueryKey,
  filterTitleFromQueryKey,
  normalizeCategoryProductsResponse,
  normalizeFilterGroups,
  normalizeProductResponse,
  normalizeSearchProductsResponse
} from './catalog.normalizer';
import { CatalogContractError } from './catalog.models';

describe('catalog normalizers', () => {
  it('normalizes the localized public Product contract without inventing optional data', () => {
    const product = normalizeProductResponse(
      {
        data: {
          _id: 'product-1',
          name: 'فلتر ناقل الحركة',
          slug: 'filter-ar',
          translations: {
            ar: { slug: 'filter-ar', shortDescription: 'وصف مختصر' },
            en: { slug: 'filter-en' }
          },
          category: { _id: 'category-1', name: 'الفلاتر', slug: 'filters-ar' },
          imageUrl: 'https://images.example/filter.webp',
          imageAlt: 'فلتر ناقل الحركة',
          retailPrice: 200,
          finalVisiblePrice: 150,
          currency: 'EGP',
          availability: 'https://schema.org/InStock',
          inventoryCount: 4,
          specifications: [{ name: 'الخامة', value: 'معدن' }]
        },
        seo: {
          canonicalUrl: 'https://store.example/ar/products/filter-ar',
          alternateUrls: {
            ar: 'https://store.example/ar/products/filter-ar',
            en: 'https://store.example/en/products/filter-en'
          }
        }
      },
      'ar'
    );

    expect(product.name).toBe('فلتر ناقل الحركة');
    expect(product.alternateSlugs.en).toBe('filter-en');
    expect(product.images).toHaveSize(1);
    expect(product.price).toEqual(
      jasmine.objectContaining({ original: 200, effective: 150, hasDiscount: true })
    );
    expect(product.availability).toBe('in-stock');
    expect(product.availableQuantity).toBe(4);
    expect(product.rating).toBeNull();
    expect(product.reviewCount).toBeNull();
  });

  it('normalizes dynamic filter groups and stable URL-safe query identities', () => {
    const title = 'نوع الزيت';
    const groups = normalizeFilterGroups([
      {
        title,
        isVisible: true,
        values: [
          { value: 'تخليقي', count: 3 },
          { value: 'غير متاح', count: 0 }
        ]
      },
      { title: 'Hidden', isVisible: false, values: ['Never shown'] }
    ]);

    expect(groups).toHaveSize(1);
    expect(groups[0]?.id).toBe(filterQueryKey(title));
    expect(filterTitleFromQueryKey(groups[0]?.id ?? '')).toBe(title);
    expect(groups[0]?.values[1]?.disabled).toBeTrue();
  });

  it('rejects malformed Category pagination instead of guessing the contract', () => {
    expect(() =>
      normalizeCategoryProductsResponse(
        {
          data: { _id: 'category-1', name: 'Filters', slug: 'filters', products: [], pagination: {} }
        },
        'en'
      )
    ).toThrowError(CatalogContractError);
  });

  it('normalizes the confirmed Search contract and selects the requested translation', () => {
    const result = normalizeSearchProductsResponse(
      {
        success: true,
        products: [
          {
            id: 'product-1',
            name: 'فلتر',
            slug: 'filter-ar',
            imageAlt: 'صورة فلتر',
            translations: {
              en: {
                name: 'Transmission filter',
                slug: 'transmission-filter',
                shortDescription: 'Replacement filter',
                imageAlt: 'Transmission filter image'
              }
            },
            imageUrl: 'https://images.example/filter.webp',
            retailPrice: 200,
            finalVisiblePrice: 200,
            currency: 'EGP'
          }
        ],
        pagination: {
          page: 1,
          limit: 12,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      'en'
    );

    expect(result.products[0]).toEqual(
      jasmine.objectContaining({
        name: 'Transmission filter',
        slug: 'transmission-filter',
        shortDescription: 'Replacement filter'
      })
    );
    expect(result.products[0]?.images[0]?.alt).toBe('Transmission filter image');
    expect(result.pagination).toEqual(jasmine.objectContaining({ totalItems: 1, hasPreviousPage: false }));
  });

  it('rejects a Search response without the confirmed products array', () => {
    expect(() =>
      normalizeSearchProductsResponse(
        { success: true, pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 0 } },
        'ar'
      )
    ).toThrowError(CatalogContractError, 'SEARCH_PRODUCTS_NOT_ARRAY');
  });
});
