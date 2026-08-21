import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { LanguageCode, TextDirection, UrlService } from './url.service';

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly urls = inject(UrlService);

  currentLanguage(): LanguageCode {
    return this.languageFromPath(this.router.url || this.document.location?.pathname || '/');
  }

  currentDirection(): TextDirection {
    return this.urls.direction(this.currentLanguage());
  }

  languageFromSnapshot(snapshot: ActivatedRouteSnapshot): LanguageCode {
    let cursor: ActivatedRouteSnapshot | null = snapshot;
    while (cursor) {
      const lang = cursor.paramMap.get('lang');
      if (lang === 'ar' || lang === 'en') return lang;
      cursor = cursor.parent;
    }
    return this.currentLanguage();
  }

  languageFromPath(path: string): LanguageCode {
    const first = path.split('?')[0].split('/').filter(Boolean)[0];
    return first === 'en' ? 'en' : 'ar';
  }

  oppositeLanguage(language = this.currentLanguage()): LanguageCode {
    return language === 'ar' ? 'en' : 'ar';
  }
}
