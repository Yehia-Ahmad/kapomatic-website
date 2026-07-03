import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { SiteHeaderComponent } from '../../components/site-header/site-header.component';
import { SiteFooterComponent } from '../../components/site-footer/site-footer.component';
import { WebsiteTargetedImagesComponent } from '../../components/website-targeted-images/website-targeted-images.component';
import { HomeCategoryProductsComponent } from '../../components/home-category-products/home-category-products.component';
import { EcommerceCategory, EcommerceService } from '../../services/ecommerce.service';
import { GeneralSettingsService } from '../../services/general-settings.service';
import { SeoService } from '../../services/seo.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    WebsiteTargetedImagesComponent,
    HomeCategoryProductsComponent
  ],
  templateUrl: './home.page.html'
})
export class HomePage {
  private readonly ecommerceService = inject(EcommerceService);
  private readonly generalSettings = inject(GeneralSettingsService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<EcommerceCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');

  constructor() {
    effect(() => {
      this.seo.setHomePage(this.generalSettings.settings());
    });

    this.ecommerceService
      .getActiveCategoriesWithProductsAndSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('تعذر تحميل الأقسام حالياً.');
          this.loading.set(false);
        }
      });
  }
}
