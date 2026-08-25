import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { SupportedLocale } from '../http/api-endpoints';
import { TRANSLATIONS, TranslationKey } from './translations';

export type TextDirection = 'rtl' | 'ltr';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly localeSignal = signal<SupportedLocale>('ar');

  readonly locale = this.localeSignal.asReadonly();
  readonly direction = computed<TextDirection>(() => (this.locale() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.applyFromPath(event.urlAfterRedirects));
  }

  initialize(): void {
    const initialPath = this.router.url || this.document.location?.pathname || '/ar';
    this.applyFromPath(initialPath);
  }

  translate(key: TranslationKey): string {
    return TRANSLATIONS[this.locale()][key];
  }

  interpolate(key: TranslationKey, values: Readonly<Record<string, string | number>>): string {
    return Object.entries(values).reduce(
      (message, [name, value]) => message.replaceAll(`{{${name}}}`, String(value)),
      this.translate(key)
    );
  }

  localeFromPath(path: string): SupportedLocale {
    const firstSegment = path.split(/[?#]/, 1)[0]?.split('/').filter(Boolean)[0];
    return firstSegment === 'en' ? 'en' : 'ar';
  }

  localizedPath(path: string, locale = this.locale()): string {
    return `/${locale}/${path.replace(/^\/+/, '')}`.replace(/\/$/, '') || `/${locale}`;
  }

  async switchLocale(target: SupportedLocale, alternateSlug?: string): Promise<boolean> {
    const tree = this.router.parseUrl(this.router.url);
    const primary = tree.root.children['primary'];
    const current = primary?.segments.map((item) => item.path) ?? [];

    if (current.length === 0) return this.router.navigate([target]);
    current[0] = target;
    if (alternateSlug && current.length >= 3 && ['categories', 'products'].includes(current[1] ?? '')) {
      current[2] = alternateSlug;
    }

    return this.router.navigate(['/', ...current], {
      queryParams: tree.queryParams,
      fragment: tree.fragment ?? undefined
    });
  }

  private applyFromPath(path: string): void {
    const locale = this.localeFromPath(path);
    this.localeSignal.set(locale);
    this.document.documentElement.lang = locale;
    this.document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }
}
