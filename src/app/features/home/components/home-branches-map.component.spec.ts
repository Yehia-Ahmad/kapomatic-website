import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { LocaleService } from '../../../core/i18n/locale.service';
import {
  BranchLocation,
  DEFAULT_STOREFRONT_SETTINGS,
  StorefrontSettings
} from '../../../domains/settings/settings.models';
import { SettingsStatus, StorefrontSettingsStore } from '../../../domains/settings/storefront-settings.store';
import { HomeBranchesMapComponent } from './home-branches-map.component';

const VALID_BRANCHES: readonly BranchLocation[] = [
  {
    id: 'one',
    name: 'الفرع الأول',
    address: 'القاهرة',
    phone: '0100 123 4567',
    latitude: 30.1393632,
    longitude: 31.357777,
    googleMapsUrl: 'https://www.google.com/maps/place/Test/!3d30.1393632!4d31.357777'
  },
  {
    id: 'two',
    name: 'Second branch',
    address: 'October',
    latitude: 29.9469264,
    longitude: 30.9138149
  }
];

interface MapInternals {
  map: import('leaflet').Map | null;
  markers: import('leaflet').LayerGroup | null;
  resizeObserver: ResizeObserver | null;
}

@Component({ standalone: true, template: '' })
class EmptyRouteComponent {}

describe('HomeBranchesMapComponent', () => {
  let fixture: ComponentFixture<HomeBranchesMapComponent>;
  let status: ReturnType<typeof signal<SettingsStatus>>;
  let settings: ReturnType<typeof signal<StorefrontSettings>>;
  let refresh: jasmine.Spy;

  beforeEach(async () => {
    status = signal<SettingsStatus>('ready');
    settings = signal<StorefrontSettings>({
      ...DEFAULT_STOREFRONT_SETTINGS,
      storeLocations: [
        ...VALID_BRANCHES,
        {
          id: 'invalid',
          name: 'Invalid coordinates',
          latitude: Number.NaN,
          longitude: 500
        }
      ]
    });
    refresh = jasmine.createSpy('refresh').and.returnValue(of(settings()));

    await TestBed.configureTestingModule({
      imports: [HomeBranchesMapComponent],
      providers: [
        provideRouter([{ path: 'en', component: EmptyRouteComponent }]),
        {
          provide: StorefrontSettingsStore,
          useValue: {
            settings: settings.asReadonly(),
            status: status.asReadonly(),
            refresh
          }
        }
      ]
    }).compileComponents();
    TestBed.inject(LocaleService).initialize();
    fixture = TestBed.createComponent(HomeBranchesMapComponent);
  });

  afterEach(() => fixture.destroy());

  it('creates markers only for valid coordinates and fits bounds around every valid branch', async () => {
    await renderMap();
    const internals = fixture.componentInstance as unknown as MapInternals;

    expect(fixture.nativeElement.querySelectorAll('.leaflet-marker-icon').length).toBe(2);
    expect(
      internals.map?.getBounds().contains([VALID_BRANCHES[0]!.latitude, VALID_BRANCHES[0]!.longitude])
    ).toBeTrue();
    expect(
      internals.map?.getBounds().contains([VALID_BRANCHES[1]!.latitude, VALID_BRANCHES[1]!.longitude])
    ).toBeTrue();
    expect(fixture.nativeElement.querySelector('.branch-marker-wrapper svg')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.leaflet-popup')).not.toBeNull();
  });

  it('fills the explicit wrapper and does not create a duplicate map when branch data updates', async () => {
    await renderMap();
    const internals = fixture.componentInstance as unknown as MapInternals;
    const firstMap = internals.map;
    const shell = fixture.nativeElement.querySelector('.branch-map-shell') as HTMLElement;
    const host = fixture.nativeElement.querySelector('.branch-map') as HTMLElement;

    expect(shell.getBoundingClientRect().height).toBeGreaterThanOrEqual(320);
    expect(host.getBoundingClientRect().width).toBe(shell.getBoundingClientRect().width);
    expect(host.getBoundingClientRect().height).toBe(shell.getBoundingClientRect().height);
    expect(internals.map?.getSize().x).toBe(host.clientWidth);
    expect(internals.map?.getSize().y).toBe(host.clientHeight);

    settings.set({ ...settings() });
    fixture.detectChanges();
    await waitForRenderFrames();

    expect((fixture.componentInstance as unknown as MapInternals).map).toBe(firstMap);
    expect(fixture.nativeElement.querySelectorAll('.leaflet-map-pane').length).toBe(1);
  });

  it('invalidates after rendering and when ResizeObserver detects a new host size', async () => {
    await renderMap();
    const internals = fixture.componentInstance as unknown as MapInternals;
    const invalidateSize = spyOn(internals.map!, 'invalidateSize').and.callThrough();
    const host = fixture.nativeElement.querySelector('.branch-map') as HTMLElement;

    settings.set({ ...settings() });
    fixture.detectChanges();
    await waitForRenderFrames();
    expect(invalidateSize).toHaveBeenCalled();

    invalidateSize.calls.reset();
    (fixture.nativeElement as HTMLElement).style.width = '640px';
    await waitForRenderFrames();
    await waitForRenderFrames();
    expect(invalidateSize).toHaveBeenCalled();
    expect(internals.map?.getSize().x).toBe(host.clientWidth);
    expect(internals.map?.getSize().y).toBe(host.clientHeight);
  });

  it('uses a sensible single-branch zoom and renders a safe localized Directions popup', async () => {
    settings.set({ ...settings(), storeLocations: [VALID_BRANCHES[0]!] });
    await renderMap();
    const internals = fixture.componentInstance as unknown as MapInternals;
    fixture.detectChanges();

    const popup = fixture.nativeElement.querySelector('.branch-popup') as HTMLElement;
    const link = fixture.nativeElement.querySelector('.branch-popup__directions') as HTMLAnchorElement;
    expect(internals.map?.getZoom()).toBe(15);
    expect(popup.textContent).toContain(VALID_BRANCHES[0]!.name);
    expect(popup.textContent).toContain(VALID_BRANCHES[0]!.address);
    expect(popup.textContent).toContain(VALID_BRANCHES[0]!.phone);
    expect(link.textContent?.trim()).toBe('الاتجاهات');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('selects the matching marker from a keyboard-accessible branch card', async () => {
    await renderMap();
    const button = fixture.nativeElement.querySelector(
      'li button[aria-label*="الفرع الأول"]'
    ) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('li[aria-current="location"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.leaflet-popup')).not.toBeNull();
    expect((fixture.componentInstance as unknown as MapInternals).map?.getZoom()).toBeGreaterThanOrEqual(16);
  });

  it('updates English content and exposes empty, error, and Retry states', async () => {
    await TestBed.inject(Router).navigateByUrl('/en');
    settings.set({ ...settings(), storeLocations: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No branches are available right now');

    status.set('error');
    fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(fixture.nativeElement.textContent).toContain('Branches could not be loaded');
    retry.click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('removes the Leaflet map during component destruction', async () => {
    await renderMap();
    const internals = fixture.componentInstance as unknown as MapInternals;
    const remove = spyOn(internals.map!, 'remove').and.callThrough();
    const disconnect = internals.resizeObserver
      ? spyOn(internals.resizeObserver, 'disconnect').and.callThrough()
      : null;

    fixture.destroy();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toBeNull();
    expect(disconnect).toHaveBeenCalled();
  });

  async function renderMap(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForRenderFrames();
    fixture.detectChanges();
  }

  async function waitForRenderFrames(): Promise<void> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await fixture.whenStable();
    fixture.detectChanges();
  }
});

describe('HomeBranchesMapComponent on the server', () => {
  it('keeps a localized placeholder without initializing Leaflet', async () => {
    const settings = signal<StorefrontSettings>({
      ...DEFAULT_STOREFRONT_SETTINGS,
      storeLocations: [VALID_BRANCHES[0]!]
    });
    await TestBed.configureTestingModule({
      imports: [HomeBranchesMapComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: StorefrontSettingsStore,
          useValue: {
            settings: settings.asReadonly(),
            status: signal<SettingsStatus>('ready').asReadonly(),
            refresh: () => of(settings())
          }
        }
      ]
    }).compileComponents();
    TestBed.inject(LocaleService).initialize();
    const fixture = TestBed.createComponent(HomeBranchesMapComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('جارٍ تجهيز خريطة الفروع');
    expect(fixture.nativeElement.querySelector('.leaflet-pane')).toBeNull();
    fixture.destroy();
  });
});
