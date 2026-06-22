import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { EcommerceService, HomePageCategory } from '../../services/ecommerce.service';

@Component({
  selector: 'app-home-category-products',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-category-products.component.html'
})
export class HomeCategoryProductsComponent {
  private readonly ecommerceService = inject(EcommerceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<HomePageCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');

  constructor() {
    this.ecommerceService
      .getHomePageCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categories.set(categories);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('تعذر تحميل منتجات الصفحة الرئيسية حالياً.');
          this.loading.set(false);
        }
      });
  }
}
