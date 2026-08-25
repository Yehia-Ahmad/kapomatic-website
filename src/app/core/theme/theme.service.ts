import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { StorefrontSettingsStore } from '../../domains/settings/storefront-settings.store';
import { createSemanticTheme } from './theme.utils';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly settingsStore = inject(StorefrontSettingsStore);

  constructor() {
    effect(() => this.apply(this.settingsStore.settings().mainColor));
  }

  initialize(): void {
    this.apply(this.settingsStore.settings().mainColor);
  }

  private apply(primaryColor: string): void {
    const palette = createSemanticTheme(primaryColor);
    const style = this.document.documentElement.style;
    style.setProperty('--brand-primary', palette.primary);
    style.setProperty('--brand-primary-hover', palette.hover);
    style.setProperty('--brand-primary-active', palette.active);
    style.setProperty('--brand-primary-soft', palette.soft);
    style.setProperty('--brand-primary-foreground', palette.foreground);
  }
}
