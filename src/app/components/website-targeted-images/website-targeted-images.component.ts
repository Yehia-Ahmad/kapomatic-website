import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import {
  TargetedWebsiteImage,
  WebsiteImagesService
} from '../../services/website-images.service';

@Component({
  selector: 'app-website-targeted-images',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './website-targeted-images.component.html'
})
export class WebsiteTargetedImagesComponent implements OnDestroy {
  private readonly websiteImagesService = inject(WebsiteImagesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private autoplayTimer?: ReturnType<typeof setInterval>;

  protected readonly images = signal<TargetedWebsiteImage[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeIndex = signal(0);
  protected readonly hasMultipleImages = computed(() => this.images().length > 1);

  constructor() {
    this.websiteImagesService
      .getActiveWithProducts()
      .subscribe({
        next: (images) => {
          this.images.set(images.filter((image) => image.id && image.imageSrc));
          this.activeIndex.set(0);
          this.startAutoplay();
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set('تعذر تحميل العروض حالياً.');
          this.loading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  protected next(): void {
    const count = this.images().length;
    if (count < 2) return;
    this.activeIndex.update((index) => (index + 1) % count);
  }

  protected previous(): void {
    const count = this.images().length;
    if (count < 2) return;
    this.activeIndex.update((index) => (index - 1 + count) % count);
  }

  protected select(index: number): void {
    if (index < 0 || index >= this.images().length) return;
    this.activeIndex.set(index);
    this.restartAutoplay();
  }

  protected startAutoplay(): void {
    if (!isPlatformBrowser(this.platformId) || !this.hasMultipleImages() || this.autoplayTimer) return;
    this.autoplayTimer = setInterval(() => this.next(), 5000);
  }

  protected stopAutoplay(): void {
    if (!this.autoplayTimer) return;
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = undefined;
  }

  private restartAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }
}
