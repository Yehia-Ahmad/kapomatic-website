import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  Renderer2,
  ViewChild,
  inject
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faGlobe, faXmark } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../core/security/public-url.utils';
import { HeaderNavigationItem } from '../../domains/header/header.models';

@Component({
  selector: 'app-mobile-nav-drawer',
  standalone: true,
  imports: [FaIconComponent, RouterLink],
  templateUrl: './mobile-nav-drawer.component.html',
  styleUrl: './mobile-nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavDrawerComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  protected readonly locale = inject(LocaleService);
  protected readonly icons = { close: faXmark, globe: faGlobe, whatsapp: faWhatsapp };
  private previousBodyOverflow = '';
  private skipLink: HTMLElement | null = null;
  private skipLinkWasInert = false;
  private skipLinkAriaHidden: string | null = null;

  @Input({ required: true }) navigation: readonly HeaderNavigationItem[] = [];
  @Input() whatsappHref = '';
  @Output() readonly closeRequested = new EventEmitter<void>();
  @ViewChild('dialogPanel', { static: true }) private dialogPanel!: ElementRef<HTMLElement>;
  @ViewChild('closeButton', { static: true }) private closeButton!: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.skipLink = this.document.querySelector<HTMLElement>('.skip-link');
    if (this.skipLink) {
      this.skipLinkWasInert = this.skipLink.inert;
      this.skipLinkAriaHidden = this.skipLink.getAttribute('aria-hidden');
      this.renderer.setProperty(this.skipLink, 'inert', true);
      this.renderer.setAttribute(this.skipLink, 'aria-hidden', 'true');
    }
    this.closeButton.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.renderer.setStyle(this.document.body, 'overflow', this.previousBodyOverflow);
    if (this.skipLink) {
      this.renderer.setProperty(this.skipLink, 'inert', this.skipLinkWasInert);
      if (this.skipLinkAriaHidden === null) this.renderer.removeAttribute(this.skipLink, 'aria-hidden');
      else this.renderer.setAttribute(this.skipLink, 'aria-hidden', this.skipLinkAriaHidden);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeRequested.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.dialogPanel.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  protected localizedUrl(item: HeaderNavigationItem): string {
    return localizedInternalUrl(item.url, this.locale.locale());
  }

  protected switchLocale(): void {
    void this.locale.switchLocale(this.locale.locale() === 'ar' ? 'en' : 'ar');
    this.closeRequested.emit();
  }
}
