import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faRotate,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../../core/security/public-url.utils';
import { HomeCategoriesStore } from '../../../domains/home/home-categories.store';
import { HomeCollectionSettings } from '../../../domains/home/home.models';
import { HomeCategoryCardComponent } from './home-category-card.component';

const DEFAULT_SETTINGS: HomeCollectionSettings = {
  layout: 'grid',
  columns: { desktop: 5, tablet: 3, mobile: 2 },
  viewAllUrl: '',
  viewAllLabel: '',
  imageShape: 'rounded',
  imageBorderRadius: 14,
  showCategoryName: true
};

@Component({
  selector: 'app-home-categories-section',
  standalone: true,
  imports: [RouterLink, FaIconComponent, HomeCategoryCardComponent],
  templateUrl: './home-categories-section.component.html',
  styleUrl: './home-section-renderer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeCategoriesSectionComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly categories = inject(HomeCategoriesStore);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() backgroundColor = '';
  @Input() settings: HomeCollectionSettings = DEFAULT_SETTINGS;

  protected readonly icons = {
    left: faChevronLeft,
    right: faChevronRight,
    retry: faRotate,
    warning: faTriangleExclamation
  };

  protected localizedUrl(url: string): string {
    return localizedInternalUrl(url, this.locale.locale());
  }
}
