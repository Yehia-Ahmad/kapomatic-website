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
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../../core/i18n/locale.service';
import { CatalogFilterGroup } from '../../../domains/catalog/catalog.models';

interface InertElementState {
  readonly element: HTMLElement;
  readonly inert: boolean;
  readonly ariaHidden: string | null;
}

@Component({
  selector: 'app-category-filter-drawer',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './category-filter-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFilterDrawerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  protected readonly locale = inject(LocaleService);
  protected readonly icons = { chevron: faChevronDown, close: faXmark };
  protected readonly draft = signal<Readonly<Record<string, string>>>({});
  protected readonly selectedCount = computed(() => Object.keys(this.draft()).length);
  private previousBodyOverflow = '';
  private backgroundElements: readonly InertElementState[] = [];

  @Input({ required: true }) groups: readonly CatalogFilterGroup[] = [];
  @Input({ required: true }) selected: Readonly<Record<string, string>> = {};
  @Output() readonly closeRequested = new EventEmitter<void>();
  @Output() readonly applyRequested = new EventEmitter<Readonly<Record<string, string>>>();
  @ViewChild('dialogPanel', { static: true }) private dialogPanel!: ElementRef<HTMLElement>;
  @ViewChild('closeButton', { static: true }) private closeButton!: ElementRef<HTMLButtonElement>;

  ngOnInit(): void {
    this.draft.set({ ...this.selected });
  }

  ngAfterViewInit(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.backgroundElements = Array.from(
      this.document.querySelectorAll<HTMLElement>('.skip-link, app-site-header, app-site-footer')
    ).map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden')
    }));
    for (const state of this.backgroundElements) {
      this.renderer.setProperty(state.element, 'inert', true);
      this.renderer.setAttribute(state.element, 'aria-hidden', 'true');
    }
    this.closeButton.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.renderer.setStyle(this.document.body, 'overflow', this.previousBodyOverflow);
    for (const state of this.backgroundElements) {
      this.renderer.setProperty(state.element, 'inert', state.inert);
      if (state.ariaHidden === null) this.renderer.removeAttribute(state.element, 'aria-hidden');
      else this.renderer.setAttribute(state.element, 'aria-hidden', state.ariaHidden);
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
        'button:not([disabled]), input:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected toggle(groupId: string, value: string): void {
    this.draft.update((current) => {
      const next = { ...current };
      if (next[groupId] === value) delete next[groupId];
      else next[groupId] = value;
      return next;
    });
  }

  protected clearGroup(groupId: string): void {
    this.draft.update((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  }

  protected clearAll(): void {
    this.draft.set({});
  }
}
