import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject
} from '@angular/core';
import { RouterModule } from '@angular/router';
import type * as Leaflet from 'leaflet';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { GeneralSettingsService, StoreLocation } from '../../services/general-settings.service';

@Component({
  standalone: true,
  imports: [RouterModule, SiteHeaderComponent, SiteFooterComponent],
  templateUrl: './locations.page.html',
  styleUrl: './locations.page.scss'
})
export class LocationsPage implements OnDestroy {
  protected readonly generalSettings = inject(GeneralSettingsService);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('leafletMap')
  private set mapElement(element: ElementRef<HTMLElement> | undefined) {
    if (element) void this.initializeMap(element.nativeElement);
  }

  private leaflet?: typeof Leaflet;
  private map?: Leaflet.Map;
  private markersLayer?: Leaflet.LayerGroup;
  private initializingMap = false;
  private destroyed = false;

  protected readonly mappableLocationsCount = computed(() =>
    this.generalSettings
      .settings()
      .storeLocations.filter((location) => this.coordinatesFromMapLink(location.mapLink) !== null).length
  );

  constructor() {
    effect(() => {
      this.generalSettings.settings();
      if (this.map) this.renderMarkers();
    });
  }

  private async initializeMap(element: HTMLElement): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.map || this.initializingMap) return;

    this.initializingMap = true;
    const leaflet = await import('leaflet');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (this.destroyed) {
      this.initializingMap = false;
      return;
    }

    this.leaflet = leaflet;
    this.map = leaflet.map(element, {
      center: [26.8206, 30.8025],
      zoom: 6,
      scrollWheelZoom: false
    });
    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      })
      .addTo(this.map);
    this.markersLayer = leaflet.layerGroup().addTo(this.map);
    this.renderMarkers();
    requestAnimationFrame(() => this.map?.invalidateSize());
    this.initializingMap = false;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.map?.remove();
  }

  private renderMarkers(): void {
    if (!this.leaflet || !this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    const points: Leaflet.LatLngExpression[] = [];
    for (const location of this.generalSettings.settings().storeLocations) {
      const coordinates = this.coordinatesFromMapLink(location.mapLink);
      if (!coordinates) continue;

      points.push(coordinates);
      const marker = this.leaflet.marker(coordinates, {
        icon: this.leaflet.divIcon({
          className: 'store-map-marker',
          html: `<span style="background-color:${this.generalSettings.settings().mainColor}"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span>`,
          iconSize: [44, 52],
          iconAnchor: [22, 50],
          tooltipAnchor: [0, -45]
        }),
        title: location.name,
        keyboard: true
      });
      marker.bindTooltip(this.locationTooltip(location), {
        direction: 'top',
        opacity: 1,
        className: 'store-map-tooltip'
      });
      marker.on('click', () => window.open(location.mapLink, '_blank', 'noopener,noreferrer'));
      marker.addTo(this.markersLayer);
    }

    if (points.length === 1) this.map.setView(points[0], 15);
    if (points.length > 1) this.map.fitBounds(this.leaflet.latLngBounds(points), { padding: [50, 50] });
  }

  private locationTooltip(location: StoreLocation): HTMLElement {
    const content = document.createElement('div');
    const name = document.createElement('strong');
    const address = document.createElement('span');
    name.textContent = location.name;
    address.textContent = location.detailedLocation;
    content.append(name, address);
    return content;
  }

  private coordinatesFromMapLink(mapLink: string): [number, number] | null {
    let decoded = mapLink;
    try {
      decoded = decodeURIComponent(mapLink);
    } catch {
      // Keep the original URL when it contains malformed escape sequences.
    }

    const patterns = [
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
      /\/place\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i
    ];
    for (const pattern of patterns) {
      const match = decoded.match(pattern);
      if (!match) continue;
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
        return [latitude, longitude];
      }
    }
    return null;
  }
}
