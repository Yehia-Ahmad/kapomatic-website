import { normalizeHomeCategoriesResponse } from './home-categories.normalizer';
import { HomeCategoriesContractError } from './home-categories.models';

describe('Home Categories response normalizer', () => {
  const response = {
    success: true,
    data: {
      categories: [
        {
          id: '66b0b7b5a8c197aa0adf1234',
          name: 'قطع غيار ناقل الحركة',
          slug: 'قطع-غيار-ناقل-الحركة',
          localizedSlugs: {
            ar: 'قطع-غيار-ناقل-الحركة',
            en: 'transmission-parts'
          },
          image: {
            url: '/api/public/images/categories/66b0b7b5a8c197aa0adf1234',
            alt: 'قطع غيار ناقل الحركة'
          },
          productsCount: 24
        }
      ]
    }
  };

  it('maps the exact DTO into the normalized Home Category model', () => {
    const result = normalizeHomeCategoriesResponse(response, (source) =>
      typeof source === 'string' ? `https://api.example.test${source.replace(/^\/api/, '')}` : ''
    );

    expect(result).toEqual([
      {
        id: '66b0b7b5a8c197aa0adf1234',
        name: 'قطع غيار ناقل الحركة',
        activeSlug: 'قطع-غيار-ناقل-الحركة',
        localizedSlugs: {
          ar: 'قطع-غيار-ناقل-الحركة',
          en: 'transmission-parts'
        },
        imageUrl: 'https://api.example.test/public/images/categories/66b0b7b5a8c197aa0adf1234',
        imageAlt: 'قطع غيار ناقل الحركة',
        productsCount: 24
      }
    ]);
  });

  it('preserves a missing alternate slug without guessing it', () => {
    const category = {
      ...response.data.categories[0],
      localizedSlugs: { ar: 'قطع-غيار-ناقل-الحركة', en: null }
    };

    const [result] = normalizeHomeCategoriesResponse({
      success: true,
      data: { categories: [category] }
    });

    expect(result?.localizedSlugs).toEqual({
      ar: 'قطع-غيار-ناقل-الحركة',
      en: undefined
    });
  });

  it('rejects unsafe image schemes as a stable missing-image state', () => {
    const category = {
      ...response.data.categories[0],
      image: { url: 'javascript:alert(1)', alt: 'Unsafe' }
    };

    const [result] = normalizeHomeCategoriesResponse({
      success: true,
      data: { categories: [category] }
    });

    expect(result?.imageUrl).toBeNull();
  });

  it('accepts an authoritative empty list', () => {
    expect(normalizeHomeCategoriesResponse({ success: true, data: { categories: [] } })).toEqual([]);
  });

  it('does not turn a malformed envelope into an empty list', () => {
    expect(() => normalizeHomeCategoriesResponse({ success: true, data: {} })).toThrowError(
      HomeCategoriesContractError,
      'HOME_CATEGORIES_ENVELOPE_INVALID'
    );
  });

  it('rejects missing slugs and invalid Product counts as contract errors', () => {
    const missingSlug = { ...response.data.categories[0], slug: '' };
    const invalidCount = { ...response.data.categories[0], productsCount: -1 };

    expect(() =>
      normalizeHomeCategoriesResponse({ success: true, data: { categories: [missingSlug] } })
    ).toThrowError(HomeCategoriesContractError, 'HOME_CATEGORY_SLUG_INVALID');
    expect(() =>
      normalizeHomeCategoriesResponse({ success: true, data: { categories: [invalidCount] } })
    ).toThrowError(HomeCategoriesContractError, 'HOME_CATEGORY_PRODUCTS_COUNT_INVALID');
  });
});
