import { InjectionToken, Injectable, inject } from '@angular/core';

export interface SsrResponseState {
  status: number;
  location: string;
}

export const SSR_RESPONSE_STATE = new InjectionToken<SsrResponseState>('SSR_RESPONSE_STATE');

@Injectable({ providedIn: 'root' })
export class SsrResponseService {
  private readonly state = inject(SSR_RESPONSE_STATE, { optional: true });

  notFound(): void {
    if (this.state) this.state.status = 404;
  }

  redirect(location: string): void {
    if (!this.state || !location.startsWith('/')) return;
    this.state.status = 301;
    this.state.location = location;
  }
}
