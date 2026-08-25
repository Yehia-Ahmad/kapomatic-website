import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxesStacked, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { HomeCategory } from '../../../domains/home/home.models';

@Component({
  selector: 'app-home-category-card',
  standalone: true,
  imports: [FaIconComponent, RouterLink, NgTemplateOutlet],
  template: `
    @if (category.slug) {
      <a
        class="group block h-full rounded-lg border border-border bg-surface p-3 shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-md"
        [routerLink]="['/', locale.locale(), 'categories', category.slug]"
      >
        <ng-container *ngTemplateOutlet="content" />
      </a>
    } @else {
      <article class="h-full rounded-lg border border-border bg-surface p-3 shadow-sm">
        <ng-container *ngTemplateOutlet="content" />
      </article>
    }
    <ng-template #content>
      <div class="grid aspect-square place-items-center overflow-hidden rounded-lg bg-canvas">
        @if (category.imageUrl) {
          <img
            class="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
            [src]="category.imageUrl"
            [alt]="category.imageAlt"
            width="220"
            height="220"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <fa-icon
            class="text-3xl text-text-muted"
            [icon]="categoryIcon"
            [attr.aria-label]="locale.translate('home.noImage')"
          />
        }
      </div>
      <div class="mt-3 flex min-h-11 items-center justify-between gap-2">
        <h3 class="line-clamp-2 text-sm font-extrabold leading-6 text-text">{{ category.name }}</h3>
        @if (category.slug) {
          <fa-icon
            class="shrink-0 text-xs text-text-muted group-hover:text-brand-active"
            [icon]="locale.direction() === 'rtl' ? leftIcon : rightIcon"
            aria-hidden="true"
          />
        }
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeCategoryCardComponent {
  protected readonly locale = inject(LocaleService);
  @Input({ required: true }) category!: HomeCategory;
  protected readonly categoryIcon = faBoxesStacked;
  protected readonly leftIcon = faChevronLeft;
  protected readonly rightIcon = faChevronRight;
}
