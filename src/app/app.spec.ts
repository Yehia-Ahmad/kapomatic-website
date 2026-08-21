import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { App } from './app';
import { GeneralSettingsService } from './services/general-settings.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: GeneralSettingsService,
          useValue: {
            settings: signal({
              mainLogo: '',
              mainColor: '#F2D200',
              currencyCode: 'EGP',
              freeShippingMinimumAmount: 0,
              websitePhone: '',
              walletPhone: '',
              instapayLink: '',
              storeLocations: [],
              socialMediaLinks: []
            }),
            load: () => undefined
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
