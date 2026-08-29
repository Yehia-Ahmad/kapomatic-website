import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLocationDot, faPhone, faRotate } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { BranchLocation } from '../../../domains/settings/settings.models';
import { hasValidBranchCoordinates } from '../../../domains/settings/settings.normalizer';
import { StorefrontSettingsStore } from '../../../domains/settings/storefront-settings.store';

@Component({
  selector: 'app-home-branches-map',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './home-branches-map.component.html',
  styleUrl: './home-branches-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeBranchesMapComponent implements OnDestroy {
  protected readonly locale = inject(LocaleService);
  protected readonly settings = inject(StorefrontSettingsStore);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private mapElement: ElementRef<HTMLElement> | null = null;
  private leafletModule: typeof import('leaflet') | null = null;
  private leafletImport: Promise<typeof import('leaflet')> | null = null;
  private map: import('leaflet').Map | null = null;
  private markers: import('leaflet').LayerGroup | null = null;
  private readonly markersByBranchId = new Map<string, import('leaflet').Marker>();
  private visibilityObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private firstRenderFrame: number | null = null;
  private secondRenderFrame: number | null = null;
  private observedWidth = 0;
  private observedHeight = 0;
  private tileErrorCount = 0;
  private preserveSelectedView = false;
  private destroyed = false;
  protected readonly mapReady = signal(false);
  protected readonly mapLoadFailed = signal(false);
  protected readonly tileLoadFailed = signal(false);
  protected readonly selectedBranchId = signal<string | null>(null);
  protected readonly branches = computed(() => this.settings.settings().storeLocations);
  protected readonly validBranches = computed(() => this.branches().filter(hasValidBranchCoordinates));
  protected readonly hasValidBranchCoordinates = hasValidBranchCoordinates;
  protected readonly icons = { location: faLocationDot, phone: faPhone, retry: faRotate };

  @Input() pageMode = false;

  @ViewChild('mapHost')
  set mapHost(element: ElementRef<HTMLElement> | undefined) {
    if (this.mapElement?.nativeElement !== element?.nativeElement) this.destroyMap();
    this.mapElement = element ?? null;
    this.scheduleMapSync();
  }

  constructor() {
    effect(() => {
      this.settings.status();
      this.settings.settings().storeLocations;
      this.locale.locale();
      this.scheduleMapSync();
    });
  }

  protected retry(): void {
    if (this.settings.status() === 'error') {
      this.settings.refresh().subscribe();
      return;
    }
    this.mapLoadFailed.set(false);
    this.tileLoadFailed.set(false);
    this.tileErrorCount = 0;
    this.leafletImport = null;
    this.scheduleMapSync();
  }

  protected directionsUrl(branch: BranchLocation): string | null {
    if (branch.googleMapsUrl) return branch.googleMapsUrl;
    if (!hasValidBranchCoordinates(branch)) return null;
    const destination = encodeURIComponent(`${branch.latitude},${branch.longitude}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  protected phoneUrl(phone: string): string {
    return `tel:${phone.replace(/[^+\d]/g, '')}`;
  }

  protected selectBranch(branch: BranchLocation): void {
    if (!hasValidBranchCoordinates(branch) || !this.map) return;
    this.preserveSelectedView = true;
    this.selectedBranchId.set(branch.id);
    this.map.setView([branch.latitude, branch.longitude], Math.max(this.map.getZoom(), 16), {
      animate: false
    });
    this.markersByBranchId.get(branch.id)?.openPopup();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroyMap();
  }

  private scheduleMapSync(): void {
    if (!this.isBrowser || this.destroyed) return;
    const view = this.document.defaultView;
    if (!view) return;
    this.cancelRenderFrames();
    this.firstRenderFrame = view.requestAnimationFrame(() => {
      this.firstRenderFrame = null;
      this.secondRenderFrame = view.requestAnimationFrame(() => {
        this.secondRenderFrame = null;
        void this.syncMap();
      });
    });
  }

  private async syncMap(): Promise<void> {
    const element = this.mapElement?.nativeElement;
    const branches = this.validBranches();
    if (!element || branches.length === 0) {
      this.destroyMap();
      return;
    }

    if (!this.hasUsableHostSize(element)) {
      this.observeSize(element);
      return;
    }

    try {
      this.leafletImport ??= import('leaflet');
      const imported = (await this.leafletImport) as typeof import('leaflet') & {
        default?: typeof import('leaflet');
      };
      const leaflet = (this.leafletModule ??=
        typeof imported.map === 'function' ? imported : (imported.default ?? null));
      if (!leaflet) throw new Error('Leaflet module did not expose its browser API.');
      if (this.destroyed || this.mapElement?.nativeElement !== element) return;
      if (!this.hasUsableHostSize(element)) {
        this.observeSize(element);
        return;
      }

      if (!this.map) {
        this.map = leaflet.map(element, {
          attributionControl: true,
          keyboard: false,
          scrollWheelZoom: false,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false
        });
        leaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          })
          .on('tileload', () => {
            this.tileErrorCount = 0;
            this.tileLoadFailed.set(false);
          })
          .on('tileerror', () => {
            this.tileErrorCount += 1;
            if (this.tileErrorCount >= 3) this.tileLoadFailed.set(true);
          })
          .addTo(this.map);
        this.markers = leaflet.layerGroup().addTo(this.map);
      }

      this.renderMarkers(leaflet, branches);
      this.map.invalidateSize({ animate: false, pan: false });
      this.applyMapView(branches);
      this.openSelectedPopup();
      this.mapReady.set(true);
      this.mapLoadFailed.set(false);
      this.observeVisibility(element);
      this.observeSize(element);
      this.schedulePostLayoutInvalidation();
    } catch {
      this.destroyMap();
      this.mapLoadFailed.set(true);
    }
  }

  private renderMarkers(leaflet: typeof import('leaflet'), branches: readonly BranchLocation[]): void {
    if (!this.map || !this.markers) return;
    this.markers.clearLayers();
    this.markersByBranchId.clear();
    const icon = leaflet.divIcon({
      className: 'branch-marker-wrapper',
      html:
        '<span class="branch-marker" aria-hidden="true"><svg viewBox="0 0 40 48" focusable="false"><path fill="currentColor" stroke="#111827" stroke-width="3" d="M20 1.5C10.06 1.5 2 9.56 2 19.5 2 32.25 20 46.5 20 46.5S38 32.25 38 19.5C38 9.56 29.94 1.5 20 1.5Z"/><circle cx="20" cy="19" r="6.5" fill="#111827"/></svg></span>',
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -44]
    });

    for (const branch of branches) {
      const marker = leaflet
        .marker([branch.latitude, branch.longitude], { icon, keyboard: false })
        .bindPopup(this.popupContent(branch), {
          closeButton: true,
          autoPan: true,
          keepInView: true
        })
        .on('click', () => {
          this.preserveSelectedView = true;
          this.selectedBranchId.set(branch.id);
        })
        .addTo(this.markers);
      this.markersByBranchId.set(branch.id, marker);
    }

    if (!branches.some((branch) => branch.id === this.selectedBranchId())) {
      this.preserveSelectedView = false;
      this.selectedBranchId.set(branches[0]?.id ?? null);
    }
  }

  private applyMapView(branches: readonly BranchLocation[]): void {
    if (!this.map || branches.length === 0) return;
    if (branches.length === 1) {
      this.map.setView([branches[0]!.latitude, branches[0]!.longitude], 15, { animate: false });
    } else {
      const bounds = this.leafletModule!.latLngBounds(
        branches.map((branch) => [branch.latitude, branch.longitude] as [number, number])
      );
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
    }
  }

  private openSelectedPopup(): void {
    const selectedId = this.selectedBranchId();
    if (selectedId) this.markersByBranchId.get(selectedId)?.openPopup();
  }

  private popupContent(branch: BranchLocation): HTMLElement {
    const popup = this.document.createElement('div');
    popup.className = 'branch-popup';
    popup.dir = this.locale.direction();

    const name = this.document.createElement('strong');
    name.textContent = branch.name;
    popup.append(name);

    if (branch.address) {
      const address = this.document.createElement('p');
      address.className = 'branch-popup__address';
      address.textContent = branch.address;
      popup.append(address);
    }

    if (branch.phone) {
      const phone = this.document.createElement('a');
      phone.className = 'branch-popup__phone';
      phone.href = this.phoneUrl(branch.phone);
      phone.textContent = branch.phone;
      phone.dir = 'ltr';
      popup.append(phone);
    }

    const directionsUrl = this.directionsUrl(branch);
    if (directionsUrl) {
      const directions = this.document.createElement('a');
      directions.className = 'branch-popup__directions';
      directions.href = directionsUrl;
      directions.target = '_blank';
      directions.rel = 'noopener noreferrer';
      directions.textContent = this.locale.translate('home.branchesDirections');
      popup.append(directions);
    }

    return popup;
  }

  private observeVisibility(element: HTMLElement): void {
    this.visibilityObserver?.disconnect();
    const Observer = this.document.defaultView?.IntersectionObserver;
    if (!Observer) {
      this.schedulePostLayoutInvalidation();
      return;
    }
    this.visibilityObserver = new Observer((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || !this.map) return;
      this.map.invalidateSize({ animate: false, pan: false });
      if (!this.preserveSelectedView) this.applyMapView(this.validBranches());
    });
    this.visibilityObserver.observe(element);
  }

  private observeSize(element: HTMLElement): void {
    this.resizeObserver?.disconnect();
    const Observer = this.document.defaultView?.ResizeObserver;
    if (!Observer) return;
    const rect = element.getBoundingClientRect();
    this.observedWidth = rect.width;
    this.observedHeight = rect.height;
    this.resizeObserver = new Observer((entries) => {
      const size = entries[0]?.contentRect;
      if (!size || size.width <= 0 || size.height <= 0) return;
      if (size.width === this.observedWidth && size.height === this.observedHeight) return;
      this.observedWidth = size.width;
      this.observedHeight = size.height;
      if (!this.map) {
        this.scheduleMapSync();
        return;
      }
      this.schedulePostLayoutInvalidation();
    });
    this.resizeObserver.observe(element);
  }

  private schedulePostLayoutInvalidation(): void {
    const view = this.document.defaultView;
    if (!view || !this.map || this.destroyed) return;
    this.cancelRenderFrames();
    this.firstRenderFrame = view.requestAnimationFrame(() => {
      this.firstRenderFrame = null;
      this.secondRenderFrame = view.requestAnimationFrame(() => {
        this.secondRenderFrame = null;
        if (!this.map) return;
        this.map.invalidateSize({ animate: false, pan: false });
        if (!this.preserveSelectedView) {
          this.applyMapView(this.validBranches());
          this.openSelectedPopup();
        }
      });
    });
  }

  private hasUsableHostSize(element: HTMLElement): boolean {
    return element.clientWidth > 0 && element.clientHeight > 0;
  }

  private destroyMap(): void {
    this.cancelRenderFrames();
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.markers = null;
    this.markersByBranchId.clear();
    this.map?.remove();
    this.map = null;
    this.preserveSelectedView = false;
    this.mapReady.set(false);
  }

  private cancelRenderFrames(): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (this.firstRenderFrame !== null) view.cancelAnimationFrame(this.firstRenderFrame);
    if (this.secondRenderFrame !== null) view.cancelAnimationFrame(this.secondRenderFrame);
    this.firstRenderFrame = null;
    this.secondRenderFrame = null;
  }
}
