import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../../core/security/public-url.utils';
import { HomeSection } from '../../../domains/home/home.models';

type OfferSection = Extract<HomeSection, { type: 'offers_slider' }>;

@Component({
  selector: 'app-home-offer-carousel',
  standalone: true,
  imports: [FaIconComponent, RouterLink],
  templateUrl: './home-offer-carousel.component.html',
  styleUrl: './home-offer-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeOfferCarouselComponent implements OnInit, OnChanges {
  protected readonly locale = inject(LocaleService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  @Input({ required: true }) section!: OfferSection;
  protected readonly currentIndex = signal(0);
  protected readonly paused = signal(false);
  protected readonly icons = {
    left: faChevronLeft,
    right: faChevronRight,
    pause: faPause,
    play: faPlay
  };
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoplay();
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['section'] && !changes['section'].firstChange) {
      this.currentIndex.set(0);
      this.startAutoplay();
    }
  }

  protected previous(): void {
    this.goTo(this.currentIndex() - 1);
  }

  protected next(): void {
    this.goTo(this.currentIndex() + 1);
  }

  protected goTo(index: number): void {
    const count = this.section.slides.length;
    if (count === 0) return;
    const next = this.section.settings.loop
      ? (index + count) % count
      : Math.min(count - 1, Math.max(0, index));
    this.currentIndex.set(next);
  }

  protected togglePaused(): void {
    this.paused.update((value) => !value);
    this.paused() ? this.clearTimer() : this.startAutoplay();
  }

  protected localizedUrl(url: string): string {
    return localizedInternalUrl(url, this.locale.locale());
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  protected pauseForInteraction(): void {
    if (this.section.settings.pauseOnHover) this.clearTimer();
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  protected resumeAfterInteraction(): void {
    if (!this.paused()) this.startAutoplay();
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.locale.direction() === 'rtl' ? this.next() : this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.locale.direction() === 'rtl' ? this.previous() : this.next();
    }
  }

  private startAutoplay(): void {
    this.clearTimer();
    if (
      !this.isBrowser ||
      !this.section?.settings.autoplay ||
      this.section.slides.length < 2 ||
      this.paused() ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    this.timer = setInterval(() => this.next(), this.section.settings.autoplayDelayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
