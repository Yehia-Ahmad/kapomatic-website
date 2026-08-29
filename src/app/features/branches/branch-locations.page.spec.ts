import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { DEFAULT_STOREFRONT_SETTINGS } from '../../domains/settings/settings.models';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { BranchLocationsPageComponent } from './branch-locations.page';

describe('BranchLocationsPageComponent', () => {
  let fixture: ComponentFixture<BranchLocationsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchLocationsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: StorefrontSettingsStore,
          useValue: {
            settings: signal(DEFAULT_STOREFRONT_SETTINGS).asReadonly(),
            status: signal('ready').asReadonly(),
            refresh: () => of(DEFAULT_STOREFRONT_SETTINGS)
          }
        },
        { provide: SeoService, useValue: { apply: jasmine.createSpy('apply') } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(BranchLocationsPageComponent);
    fixture.detectChanges();
  });

  it('renders one localized H1, breadcrumb, introduction, and the real branch component', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1').length).toBe(1);
    expect(element.querySelector('h1')?.textContent).toContain('أماكن الفروع');
    expect(element.querySelector('nav[aria-label]')).not.toBeNull();
    expect(element.querySelector('app-home-branches-map')).not.toBeNull();
    expect(element.textContent).not.toContain('هذه الصفحة مهيأة تقنياً');
    expect(element.textContent).not.toContain('تنتظر اعتماد التصميم');
  });
});
