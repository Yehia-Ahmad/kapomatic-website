import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../core/http/api-error';
import { normalizeApiError } from '../../core/http/api-error.interceptor';
import { SupportedLocale } from '../../core/http/api-endpoints';
import { HomePageContent } from './home.models';
import { HomeRepository } from './home.repository';

export type HomeStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class HomeStore {
  private readonly repository = inject(HomeRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly contentSignal = signal<HomePageContent | null>(null);
  private readonly statusSignal = signal<HomeStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);
  private activeLocale: SupportedLocale | null = null;

  readonly content = this.contentSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly sections = computed(() => this.contentSignal()?.sections ?? []);
  readonly issues = computed(() => this.contentSignal()?.issues ?? []);
  readonly hasPartialError = computed(() => this.sections().length > 0 && this.issues().length > 0);

  load(locale: SupportedLocale, force = false): void {
    if (!force && this.activeLocale === locale && this.statusSignal() !== 'idle') return;
    this.activeLocale = locale;
    this.statusSignal.set(this.contentSignal()?.locale === locale ? 'refreshing' : 'loading');
    this.errorSignal.set(null);

    this.repository
      .load(locale, force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (content) => {
          this.contentSignal.set(content);
          if (content.sections.length > 0) this.statusSignal.set('ready');
          else if (content.issues.length > 0) this.statusSignal.set('error');
          else this.statusSignal.set('empty');
        },
        error: (error: unknown) => {
          this.errorSignal.set(error instanceof ApiError ? error : normalizeApiError(error));
          this.statusSignal.set('error');
        }
      });
  }

  retry(): void {
    if (this.activeLocale) this.load(this.activeLocale, true);
  }
}
