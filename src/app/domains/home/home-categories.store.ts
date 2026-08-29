import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../core/http/api-error';
import { normalizeApiError } from '../../core/http/api-error.interceptor';
import { SupportedLocale } from '../../core/http/api-endpoints';
import { HomeCategoriesContractError } from './home-categories.models';
import { HomeCategoriesService } from './home-categories.service';
import { HomeCategory } from './home.models';

export type HomeCategoriesStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'empty'
  | 'error'
  | 'malformed';

@Injectable({ providedIn: 'root' })
export class HomeCategoriesStore {
  private readonly service = inject(HomeCategoriesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly categoriesSignal = signal<readonly HomeCategory[]>([]);
  private readonly statusSignal = signal<HomeCategoriesStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);
  private activeLocale: SupportedLocale | null = null;
  private contentLocale: SupportedLocale | null = null;
  private requestSequence = 0;

  readonly categories = this.categoriesSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  load(locale: SupportedLocale, force = false): void {
    if (!force && this.activeLocale === locale && this.statusSignal() !== 'idle') return;
    this.activeLocale = locale;
    const requestId = ++this.requestSequence;
    const canKeepContent = this.contentLocale === locale && this.categoriesSignal().length > 0;
    if (!canKeepContent) this.categoriesSignal.set([]);
    this.statusSignal.set(canKeepContent ? 'refreshing' : 'loading');
    this.errorSignal.set(null);

    this.service
      .load(locale, force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          if (requestId !== this.requestSequence || this.activeLocale !== locale) return;
          this.contentLocale = locale;
          this.categoriesSignal.set(categories);
          this.statusSignal.set(categories.length > 0 ? 'ready' : 'empty');
        },
        error: (error: unknown) => {
          if (requestId !== this.requestSequence || this.activeLocale !== locale) return;
          if (error instanceof HomeCategoriesContractError) {
            this.statusSignal.set('malformed');
            return;
          }
          this.errorSignal.set(error instanceof ApiError ? error : normalizeApiError(error));
          this.statusSignal.set('error');
        }
      });
  }

  retry(): void {
    if (this.activeLocale) this.load(this.activeLocale, true);
  }
}
