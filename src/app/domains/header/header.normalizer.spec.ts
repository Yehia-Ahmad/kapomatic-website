import { fallbackHeaderConfig, normalizeHeaderConfig } from './header.normalizer';

describe('Header response normalizer', () => {
  it('maps localized navigation and keeps only safe links', () => {
    const config = normalizeHeaderConfig(
      {
        success: true,
        data: {
          settings: {
            showTopBar: true,
            topBar: {
              text: { ar: 'إعلان', en: 'Announcement' },
              backgroundColor: '#FFFFFF',
              textColor: '#FFFFFF'
            },
            logoUrl: '/api/header/logo',
            contact: { showWhatsapp: true, whatsappNumber: '+20 100 000 0000' }
          },
          navigation: [
            { id: 'safe', label: { ar: 'الرئيسية', en: 'Home' }, url: '/' },
            { id: 'unsafe', label: 'Bad', url: 'javascript:alert(1)' }
          ]
        }
      },
      'en'
    );

    expect(config.navigation.length).toBe(1);
    expect(config.navigation[0]?.label).toBe('Home');
    expect(config.desktopLogoUrl).toBe('/api/header/logo');
    expect(config.topBar.textColor).not.toBe('#FFFFFF');
    expect(config.contact.showWhatsapp).toBeTrue();
  });

  it('provides a neutral, capability-safe fallback without fake branding or contact', () => {
    const fallback = fallbackHeaderConfig('ar');
    expect(fallback.desktopLogoUrl).toBe('');
    expect(fallback.topBar.visible).toBeFalse();
    expect(fallback.contact.showWhatsapp).toBeFalse();
    expect(fallback.navigation).toEqual([]);
  });
});
