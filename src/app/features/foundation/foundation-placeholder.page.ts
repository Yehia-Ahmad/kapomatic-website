import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';
import { TranslationKey } from '../../core/i18n/translations';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main-content" class="mx-auto min-h-[60vh] max-w-content px-4 py-16" tabindex="-1">
      <h1 class="text-2xl font-bold text-text sm:text-3xl">{{ title() }}</h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-text-muted">
        {{ locale.translate('foundation.awaitingDesign') }}
      </p>
    </main>
  `
})
export class FoundationPlaceholderPageComponent {
  protected readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly pageKey = (this.route.snapshot.data['pageKey'] ?? 'page.notFound') as TranslationKey;

  protected readonly title = computed(() => this.locale.translate(this.pageKey));
}
