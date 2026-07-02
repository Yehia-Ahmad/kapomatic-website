import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type GovernmentShipping = {
  name: string;
  fee: number;
};

export type ShippingSettings = {
  governments: GovernmentShipping[];
  freeShippingMinimum: number | null;
};

export enum PaymentMethod {
  Cash = 'cash',
  EWallet = 'wallet',
  InstaPay = 'instapay'
}

export type CheckoutProduct = {
  productId: string;
  price: number;
  quantity: number;
};

export type CheckoutRequest = {
  customerName: string;
  customerPhone: string;
  government: string;
  shippingLocation: string;
  paymentMethod: PaymentMethod;
  transferPhone: string;
  transferImage: string;
  products: CheckoutProduct[];
};

export type CheckoutResult = {
  _id?: string;
  orderId?: string;
  invoiceId?: string;
  [key: string]: unknown;
};

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.api_base_url.replace(/\/+$/, '');

  getShippingSettings(): Observable<ShippingSettings> {
    return this.http
      .get<unknown>(`${this.apiBaseUrl}/ecommerce-settings/shipping/governments`)
      .pipe(map((response) => this.mapShippingSettings(response)));
  }

  checkout(payload: CheckoutRequest): Observable<CheckoutResult> {
    return this.http.post<CheckoutResult>(`${this.apiBaseUrl}/cart/checkout`, payload);
  }

  private mapShippingSettings(source: unknown): ShippingSettings {
    const root = this.asRecord(source);
    const data = this.asRecord(root['data']);
    const result = this.asRecord(root['result']);
    const body = Object.keys(data).length ? data : Object.keys(result).length ? result : root;
    const rawGovernments =
      body['governmentFees'] ?? body['governments'] ?? body['governmentShippingFees'] ?? body['shippingFees'] ?? body['items'] ??
      (Array.isArray(root['data']) ? root['data'] : Array.isArray(root['result']) ? root['result'] : source);

    const governments = (Array.isArray(rawGovernments) ? rawGovernments : [])
      .map((entry) => {
        if (typeof entry === 'string') return { name: entry, fee: 0 };
        const item = this.asRecord(entry);
        const name = this.readString(item, ['government', 'governorate', 'name', 'title']);
        const fee = this.readNumber(item, ['shippingFees', 'shippingFee', 'fee', 'price', 'cost']);
        return name ? { name, fee } : null;
      })
      .filter((item): item is GovernmentShipping => item !== null);

    const minimum = this.readOptionalNumber(body, [
      'freeShippingMinimum',
      'freeShippingMinimumAmount',
      'freeShippingThreshold',
      'minimumForFreeShipping'
    ]) ?? this.readOptionalNumber(root, [
      'freeShippingMinimum',
      'freeShippingMinimumAmount',
      'freeShippingThreshold',
      'minimumForFreeShipping'
    ]);

    return { governments, freeShippingMinimum: minimum };
  }

  private readString(source: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  private readNumber(source: Record<string, unknown>, keys: string[]): number {
    return this.readOptionalNumber(source, keys) ?? 0;
  }

  private readOptionalNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = Number(source[key]);
      if (Number.isFinite(value) && source[key] !== '' && source[key] != null) return value;
    }
    return null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
