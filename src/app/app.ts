import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GeneralSettingsService } from './services/general-settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly generalSettings = inject(GeneralSettingsService);
  protected readonly whatsappHref = computed(() => {
    const phone = this.generalSettings.settings().websitePhone;
    const normalizedPhone = this.normalizeWhatsAppPhone(phone);

    return normalizedPhone ? `https://wa.me/${normalizedPhone}` : '';
  });

  constructor() {
    this.generalSettings.load();
  }

  private normalizeWhatsAppPhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = `20${digits.slice(1)}`;

    return digits;
  }
}
