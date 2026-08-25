import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBoxOpen, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home-state-panel',
  standalone: true,
  imports: [FaIconComponent],
  template: `
    <section class="mx-auto max-w-content px-4 py-16 text-center" [attr.role]="error ? 'alert' : 'status'">
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-2xl text-text-muted"
      >
        <fa-icon [icon]="error ? errorIcon : emptyIcon" aria-hidden="true" />
      </div>
      <h1 class="mt-5 text-2xl font-extrabold text-text">{{ title }}</h1>
      <p class="mx-auto mt-3 max-w-lg leading-7 text-text-muted">{{ description }}</p>
      @if (retryLabel) {
        <button
          type="button"
          class="mt-6 min-h-11 rounded-lg bg-brand px-6 py-2.5 font-extrabold text-brand-foreground transition hover:bg-brand-hover active:bg-brand-active"
          (click)="retry.emit()"
        >
          {{ retryLabel }}
        </button>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeStatePanelComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input() retryLabel = '';
  @Input() error = false;
  @Output() readonly retry = new EventEmitter<void>();
  protected readonly errorIcon = faTriangleExclamation;
  protected readonly emptyIcon = faBoxOpen;
}
