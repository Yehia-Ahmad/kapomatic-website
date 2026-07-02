import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

export type StoreLocation = {
  name: string;
  detailedLocation: string;
  mapLink: string;
};

export type SocialMediaLink = {
  name: string;
  link: string;
};

export type GeneralSettings = {
  mainLogo: string;
  mainColor: string;
  currencyCode: string;
  freeShippingMinimumAmount: number;
  walletPhone: string;
  instapayLink: string;
  storeLocations: StoreLocation[];
  socialMediaLinks: SocialMediaLink[];
};

const DEFAULT_SETTINGS: GeneralSettings = {
  mainLogo: '',
  mainColor: '#F2D200',
  currencyCode: 'EGP',
  freeShippingMinimumAmount: 0,
  walletPhone: '',
  instapayLink: '',
  storeLocations: [],
  socialMediaLinks: []
};

@Injectable({ providedIn: 'root' })
export class GeneralSettingsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = environment.api_base_url.replace(/\/+$/, '');
  private loaded = false;

  readonly settings = signal<GeneralSettings>(DEFAULT_SETTINGS);
  readonly loading = signal(false);
  readonly loadError = signal('');

  load(): void {
    if (this.loaded || this.loading() || !isPlatformBrowser(this.platformId)) return;

    this.loading.set(true);
    this.loadError.set('');
    this.http
      .get<unknown>(`${this.apiBaseUrl}/ecommerce-settings/general`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.settings.set(this.mapSettings(response));
          this.loaded = true;
        },
        error: () => this.loadError.set('تعذر تحميل إعدادات المتجر حالياً.')
      });
  }

  socialIcon(name: string): string {
    const normalized = name.trim().toLowerCase();
    const icons: [string[], string][] = [
      [['facebook', 'فيسبوك'], 'fa-brands fa-facebook-f'],
      [['instagram', 'انستجرام', 'انستغرام'], 'fa-brands fa-instagram'],
      [['x', 'twitter', 'تويتر'], 'fa-brands fa-x-twitter'],
      [['youtube', 'يوتيوب'], 'fa-brands fa-youtube'],
      [['tiktok', 'تيك توك'], 'fa-brands fa-tiktok'],
      [['linkedin', 'لينكدإن', 'لينكد ان'], 'fa-brands fa-linkedin-in'],
      [['whatsapp', 'واتساب', 'واتس اب'], 'fa-brands fa-whatsapp'],
      [['telegram', 'تيليجرام', 'تلجرام'], 'fa-brands fa-telegram'],
      [['snapchat', 'سناب شات'], 'fa-brands fa-snapchat'],
      [['pinterest', 'بنترست'], 'fa-brands fa-pinterest-p'],
      [['threads', 'ثريدز'], 'fa-brands fa-threads'],
      [['discord', 'ديسكورد'], 'fa-brands fa-discord'],
      [['reddit', 'ريديت'], 'fa-brands fa-reddit-alien'],
      [['github', 'جيت هب'], 'fa-brands fa-github']
    ];
    return icons.find(([aliases]) => aliases.includes(normalized))?.[1] ?? 'fa-solid fa-link';
  }

  private mapSettings(source: unknown): GeneralSettings {
    const root = this.asRecord(source);
    const data = this.asRecord(root['data']);
    const result = this.asRecord(root['result']);
    const value = Object.keys(data).length ? data : Object.keys(result).length ? result : root;

    return {
      mainLogo: this.readString(value['mainLogo']),
      mainColor: this.validColor(this.readString(value['mainColor'])),
      currencyCode: this.readString(value['currencyCode']) || DEFAULT_SETTINGS.currencyCode,
      freeShippingMinimumAmount: this.readNonNegativeNumber(value['freeShippingMinimumAmount']),
      walletPhone: this.readString(value['walletPhone']),
      instapayLink: this.readString(value['instapayLink']),
      storeLocations: this.readArray(value['storeLocations'])
        .map((entry) => {
          const item = this.asRecord(entry);
          const name = this.readString(item['name']);
          const detailedLocation = this.readString(item['detailedLocation']);
          const mapLink = this.readString(item['mapLink']);
          return name && mapLink ? { name, detailedLocation, mapLink } : null;
        })
        .filter((item): item is StoreLocation => item !== null),
      socialMediaLinks: this.readArray(value['socialMediaLinks'])
        .map((entry) => {
          const item = this.asRecord(entry);
          const name = this.readString(item['name']);
          const link = this.readString(item['link']);
          return name && link ? { name, link } : null;
        })
        .filter((item): item is SocialMediaLink => item !== null)
    };
  }

  private validColor(value: string): string {
    return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_SETTINGS.mainColor;
  }

  private readArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private readString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private readNonNegativeNumber(value: unknown): number {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
