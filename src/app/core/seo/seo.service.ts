import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ApiUrlBuilder } from '../http/api-url.builder';
import { SeoPageDefinition } from './seo.models';

const GENERATED_ATTRIBUTE = 'data-kapomatic-seo';
const STRUCTURED_DATA_ID = 'kapomatic-structured-data';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly urls = inject(ApiUrlBuilder);

  apply(page: SeoPageDefinition): void {
    const canonicalUrl = this.urls.site(page.path);
    const imageUrl = page.imageUrl ? this.absoluteUrl(page.imageUrl) : '';
    const locale = page.locale === 'ar' ? 'ar_EG' : 'en_EG';

    this.title.setTitle(page.title);
    this.setName('description', page.description);
    this.setName('robots', page.robots ?? 'index,follow');
    this.setProperty('og:title', page.title);
    this.setProperty('og:description', page.description);
    this.setProperty('og:type', page.type ?? 'website');
    this.setProperty('og:url', canonicalUrl);
    this.setProperty('og:locale', locale);
    this.setName('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    this.setName('twitter:title', page.title);
    this.setName('twitter:description', page.description);

    if (imageUrl) {
      this.setProperty('og:image', imageUrl);
      this.setName('twitter:image', imageUrl);
    } else {
      this.meta.removeTag("property='og:image'");
      this.meta.removeTag("name='twitter:image'");
    }

    this.replaceGeneratedLinks(canonicalUrl, page.alternatePaths);
    this.replaceStructuredData(page.structuredData ?? []);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private replaceGeneratedLinks(canonicalUrl: string, alternates: SeoPageDefinition['alternatePaths']): void {
    this.document.head
      .querySelectorAll(`link[${GENERATED_ATTRIBUTE}]`)
      .forEach((element) => element.remove());
    this.appendLink('canonical', canonicalUrl);

    if (!alternates) return;
    if (alternates.ar) this.appendLink('alternate', this.urls.site(alternates.ar), 'ar');
    if (alternates.en) this.appendLink('alternate', this.urls.site(alternates.en), 'en');
    if (alternates.xDefault) this.appendLink('alternate', this.urls.site(alternates.xDefault), 'x-default');
  }

  private appendLink(rel: string, href: string, hreflang?: string): void {
    const link = this.document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.setAttribute(GENERATED_ATTRIBUTE, 'true');
    if (hreflang) link.hreflang = hreflang;
    this.document.head.appendChild(link);
  }

  private absoluteUrl(value: string): string {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : this.urls.site(value);
    } catch {
      return this.urls.site(value);
    }
  }

  private replaceStructuredData(items: readonly Record<string, unknown>[]): void {
    this.document.getElementById(STRUCTURED_DATA_ID)?.remove();
    if (items.length === 0) return;

    const script = this.document.createElement('script');
    script.id = STRUCTURED_DATA_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(items.length === 1 ? items[0] : items);
    this.document.head.appendChild(script);
  }
}
