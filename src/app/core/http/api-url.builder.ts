import { Injectable, inject } from '@angular/core';
import { APP_RUNTIME_CONFIG } from '../config/app-runtime-config';

@Injectable({ providedIn: 'root' })
export class ApiUrlBuilder {
  private readonly config = inject(APP_RUNTIME_CONFIG);

  api(path: string): string {
    const normalizedPath = `/${path.trim().replace(/^\/+/, '')}`;
    return `${this.config.apiBaseUrl.replace(/\/+$/, '')}${normalizedPath}`;
  }

  site(path = '/'): string {
    const normalizedPath = `/${path.trim().replace(/^\/+/, '')}`;
    return this.config.siteUrl ? `${this.config.siteUrl}${normalizedPath}` : normalizedPath;
  }
}
