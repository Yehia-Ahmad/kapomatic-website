import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/i18n/locale.service';
import { SeoService } from '../../core/seo/seo.service';
import { HomeBranchesMapComponent } from '../home/components/home-branches-map.component';

@Component({
  standalone: true,
  imports: [RouterLink, HomeBranchesMapComponent],
  templateUrl: './branch-locations.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BranchLocationsPageComponent {
  protected readonly locale = inject(LocaleService);
  private readonly seo = inject(SeoService);

  constructor() {
    effect(() => {
      const locale = this.locale.locale();
      this.seo.apply({
        title: this.locale.translate('branches.seoTitle'),
        description: this.locale.translate('branches.introduction'),
        path: `/${locale}/branches`,
        locale,
        alternatePaths: {
          ar: '/ar/branches',
          en: '/en/branches',
          xDefault: '/ar/branches'
        }
      });
    });
  }
}
