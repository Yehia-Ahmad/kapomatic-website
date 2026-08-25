import { DEFAULT_STOREFRONT_SETTINGS } from './settings.models';
import { normalizeStorefrontSettings, readPersistedSettings } from './settings.normalizer';

describe('settings normalizer', () => {
  it('normalizes the confirmed general-settings response fields', () => {
    const settings = normalizeStorefrontSettings({
      data: {
        mainLogo: 'data:image/png;base64,AAAA',
        mainColor: '#1a73e8',
        currencyCode: 'egp',
        freeShippingMinimumAmount: '500',
        walletPhone: ' 01000000000 ',
        instapayLink: 'https://example.test/pay',
        storeLocations: [
          { _id: 'loc-1', name: 'Nasr City', detailedLocation: 'Street', mapLink: 'https://maps.test/a' }
        ],
        socialMediaLinks: [{ name: 'Facebook', link: 'https://social.test/page' }]
      }
    });

    expect(settings.mainColor).toBe('#1A73E8');
    expect(settings.currencyCode).toBe('EGP');
    expect(settings.freeShippingMinimumAmount).toBe(500);
    expect(settings.storeLocations.length).toBe(1);
    expect(settings.socialMediaLinks.length).toBe(1);
  });

  it('rejects unsafe URLs, negative values, and invalid colors', () => {
    const settings = normalizeStorefrontSettings({
      mainLogo: 'javascript:alert(1)',
      mainColor: 'red',
      currencyCode: 'pounds',
      freeShippingMinimumAmount: -1,
      instapayLink: 'javascript:alert(1)'
    });

    expect(settings.mainLogo).toBe('');
    expect(settings.mainColor).toBe(DEFAULT_STOREFRONT_SETTINGS.mainColor);
    expect(settings.currencyCode).toBe('EGP');
    expect(settings.freeShippingMinimumAmount).toBe(0);
    expect(settings.instapayLink).toBe('');
  });

  it('rejects corrupted or outdated persisted settings', () => {
    expect(
      readPersistedSettings({ version: 2, updatedAt: new Date().toISOString(), settings: {} })
    ).toBeNull();
    expect(readPersistedSettings({ version: 1, updatedAt: 'invalid', settings: {} })).toBeNull();
    expect(
      readPersistedSettings({ version: 1, updatedAt: new Date().toISOString(), settings: {} })?.version
    ).toBe(1);
  });
});
