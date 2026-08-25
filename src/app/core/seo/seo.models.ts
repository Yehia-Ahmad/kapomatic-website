import { SupportedLocale } from '../http/api-endpoints';

export interface SeoAlternatePaths {
  readonly ar?: string;
  readonly en?: string;
  readonly xDefault?: string;
}

export interface SeoPageDefinition {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly locale: SupportedLocale;
  readonly robots?: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  readonly type?: 'website' | 'product';
  readonly imageUrl?: string;
  readonly alternatePaths?: SeoAlternatePaths;
  readonly structuredData?: readonly Record<string, unknown>[];
}
