import { DEFAULT_STOREFRONT_SETTINGS } from './settings.models';
import {
  hasValidBranchCoordinates,
  normalizeStorefrontSettings,
  readPersistedSettings
} from './settings.normalizer';

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
          {
            _id: 'loc-1',
            name: 'Nasr City',
            detailedLocation: 'Street',
            mapLink: 'https://www.google.com/maps/place/Test/@30.1,31.2,17z/data=!3d30.11!4d31.22'
          }
        ],
        socialMediaLinks: [{ name: 'Facebook', link: 'https://social.test/page' }]
      }
    });

    expect(settings.mainColor).toBe('#1A73E8');
    expect(settings.currencyCode).toBe('EGP');
    expect(settings.freeShippingMinimumAmount).toBe(500);
    expect(settings.storeLocations.length).toBe(1);
    expect(settings.storeLocations[0]).toEqual(
      jasmine.objectContaining({
        id: 'loc-1',
        name: 'Nasr City',
        address: 'Street',
        latitude: 30.11,
        longitude: 31.22
      })
    );
    expect(settings.socialMediaLinks.length).toBe(1);
  });

  it('keeps branch information but marks missing or invalid coordinates as unusable', () => {
    const settings = normalizeStorefrontSettings({
      storeLocations: [
        { name: 'No coordinates', detailedLocation: 'Known address' },
        { name: 'Serialized invalid coordinates', latitude: null, longitude: null },
        { name: 'Invalid coordinates', latitude: 95, longitude: 181 },
        { name: 'Unsafe map', mapLink: 'https://example.test/@30,31,17z' }
      ]
    });

    expect(settings.storeLocations.length).toBe(4);
    expect(settings.storeLocations.every((branch) => !hasValidBranchCoordinates(branch))).toBeTrue();
    expect(settings.storeLocations[3]?.googleMapsUrl).toBeUndefined();
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

  it('preserves normalized branch fields when settings pass through browser persistence', () => {
    const updatedAt = new Date().toISOString();
    const persisted = readPersistedSettings({
      version: 1,
      updatedAt,
      settings: {
        ...DEFAULT_STOREFRONT_SETTINGS,
        storeLocations: [
          {
            id: 'persisted',
            name: 'Persisted branch',
            address: 'Saved address',
            latitude: 30,
            longitude: 31,
            googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=30%2C31'
          }
        ]
      }
    });

    expect(persisted?.settings.storeLocations[0]).toEqual(
      jasmine.objectContaining({
        address: 'Saved address',
        latitude: 30,
        longitude: 31,
        googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=30%2C31'
      })
    );
  });
});
