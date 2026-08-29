import {
  filterQueryKey,
  filterTitleFromQueryKey,
  normalizeCategoryProductsResponse,
  normalizeFilterGroups,
  normalizeProductResponse
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
});
