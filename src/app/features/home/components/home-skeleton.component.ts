import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService } from '../../../core/i18n/locale.service';

@Component({
  selector: 'app-home-skeleton',
  standalone: true,
  template: `
    <section class="mx-auto max-w-content px-4 py-6" aria-busy="true" aria-live="polite">
      <span class="sr-only">{{ locale.translate('home.loading') }}</span>
      <div class="skeleton aspect-[16/10] rounded-xl sm:aspect-[16/7] lg:aspect-[16/5]"></div>
      <div class="mt-10 h-7 w-44 rounded skeleton"></div>
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        @for (item of categoryItems; track item) {
          <div class="rounded-lg border border-border bg-surface p-3">
            <div class="skeleton aspect-square rounded-lg"></div>
            <div class="skeleton mx-auto mt-3 h-4 w-3/4 rounded"></div>
          </div>
        }
      </div>
      <div class="mt-10 h-7 w-48 rounded skeleton"></div>
      <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        @for (item of productItems; track item) {
          <div class="rounded-lg border border-border bg-surface p-3">
            <div class="skeleton aspect-square rounded-lg"></div>
            <div class="skeleton mt-3 h-4 w-5/6 rounded"></div>
            <div class="skeleton mt-2 h-4 w-1/2 rounded"></div>
            <div class="skeleton mt-4 h-11 rounded-lg"></div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .skeleton {
        background: linear-gradient(90deg, #e7e9ed 25%, #f3f4f6 50%, #e7e9ed 75%);
        background-size: 200% 100%;
        animation: skeleton-wave 1.4s ease-in-out infinite;
      }
      @keyframes skeleton-wave {
        to {
          background-position: -200% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton {
          animation: none;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeSkeletonComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly categoryItems = [1, 2, 3, 4, 5, 6];
  protected readonly productItems = [1, 2, 3, 4, 5];
}
