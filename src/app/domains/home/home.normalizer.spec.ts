import {
  normalizeDynamicHomePage,
  normalizeLegacyCategories,
  normalizeLegacyPromotions
} from './home.normalizer';
import { HomeContractError } from './home.models';

describe('Home response normalizer', () => {
  it('maps the confirmed dynamic builder envelope into discriminated sections', () => {
    const result = normalizeDynamicHomePage(
      {
        success: true,
        data: {
          sections: [
            {
              id: 'categories-1',
              type: 'categories',
              title: { ar: 'الأقسام', en: 'Categories' },
              settings: {
                columns: { desktop: 6, tablet: 4, mobile: 2 },
                imageShape: 'circle',
                imageBorderRadius: 24,
                showCategoryName: false,
                categories: [
                  {
                    id: 'category-1',
                    name: { ar: 'زيوت', en: 'Oils' },
                    slug: { ar: 'zيوت', en: 'oils' },
                    image: 'https://images.test/oils.webp'
                  }
                ]
              }
            },
            {
              id: 'products-1',
              type: 'products',
              settings: {
                products: [
                  {
                    id: 'product-1',
                    name: 'ATF',
                    retailPrice: 100,
                    priceAfterDiscount: 80,
                    discountPercentage: 20,
                    inventoryCount: 3,
                    image: 'https://images.test/atf.webp'
                  }
                ]
              }
            }
          ]
        }
      },
      'en'
    );

    expect(result.content.sections.length).toBe(2);
    expect(result.content.capabilities.dynamicBuilder).toBeTrue();
    const categorySection = result.content.sections[0];
    expect(categorySection?.type).toBe('categories');
    if (categorySection?.type === 'categories') {
      expect(categorySection.categories[0]?.name).toBe('Oils');
      expect(categorySection.settings.columns.mobile).toBe(2);
      expect(categorySection.settings.imageShape).toBe('circle');
      expect(categorySection.settings.imageBorderRadius).toBe(24);
      expect(categorySection.settings.showCategoryName).toBeFalse();
    }
    const productSection = result.content.sections[1];
    if (productSection?.type === 'products') {
      expect(productSection.products[0]?.price?.sale).toBe(80);
      expect(productSection.products[0]?.availability).toBe('in-stock');
    }
  });

  it('rejects a malformed root contract instead of reporting a normal empty page', () => {
    expect(() => normalizeDynamicHomePage({ data: { sections: {} } }, 'ar')).toThrowError(
      HomeContractError,
      'HOME_SECTIONS_NOT_ARRAY'
    );
  });

  it('omits malformed optional sections and reports the contract issue', () => {
    const result = normalizeDynamicHomePage(
      {
        data: {
          sections: [
            { type: 'products', settings: { products: [] } },
            { id: 'unknown-1', type: 'unsupported', settings: {} },
            {
              id: 'offers-1',
              type: 'offers_slider',
              settings: { slides: [{ id: 'missing-image' }] }
            }
          ]
        }
      },
      'ar'
    );

    expect(result.content.sections).toEqual([]);
    expect(result.discardedSectionCount).toBe(3);
    expect(result.content.issues[0]?.kind).toBe('contract');
  });

  it('uses only explicitly selected legacy products and keeps regions independently optional', () => {
    const sections = normalizeLegacyCategories(
      {
        categoryIds: ['category-1'],
        categories: [{ _id: 'category-1', name: 'زيوت', image: '/api/category-1' }]
      },
      [
        {
          category: { _id: 'category-1', name: 'زيوت' },
          setting: { selectedProducts: ['selected-product'] },
          products: [
            { _id: 'selected-product', name: 'A', retailPrice: 10, inventoryCount: 1 },
            { _id: 'hidden-product', name: 'B', retailPrice: 20, inventoryCount: 2 }
          ]
        }
      ],
      'ar'
    );

    expect(sections.length).toBe(2);
    const products = sections[1];
    if (products?.type === 'products') {
      expect(products.products.map((item) => item.id)).toEqual(['selected-product']);
    }
  });

  it('merges localized active category data and authoritative public product slugs into Home cards', () => {
    const sections = normalizeLegacyCategories(
      {
        categoryIds: ['category-1'],
        categories: [{ _id: 'category-1', name: 'فلاتر', image: '/api/category-1' }]
      },
      [
        {
          category: {
            _id: 'category-1',
            name: 'فلاتر',
            translations: {
              ar: { name: 'فلاتر', slug: 'فلاتر-فتيس' },
              en: { name: 'Filters', slug: 'transmission-filters' }
            }
          },
          setting: { selectedProducts: ['product-1'] },
          products: [{ _id: 'product-1', name: 'فلتر', retailPrice: 10, inventoryCount: 1 }]
        }
      ],
      'en',
      undefined,
      { products: { 'product-1': 'transmission-filter' } }
    );

    const categories = sections[0];
    const products = sections[1];
    expect(categories?.type === 'categories' ? categories.categories[0]?.slug : '').toBe(
      'transmission-filters'
    );
    expect(products?.type === 'products' ? products.settings.viewAllUrl : '').toBe(
      '/en/categories/transmission-filters'
    );
    expect(products?.type === 'products' ? products.products[0]?.slug : '').toBe('transmission-filter');
  });

  it('omits legacy promotions without a safe backend image', () => {
    expect(
      normalizeLegacyPromotions(
        [
          { _id: 'one', imageUrl: 'javascript:alert(1)' },
          { _id: 'two', imageUrl: '/api/banner' }
        ],
        'en'
      )[0]
    ).toEqual(jasmine.objectContaining({ type: 'offers_slider' }));
  });
});
