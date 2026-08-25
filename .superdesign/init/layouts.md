# Shared Layouts

The current layout is deliberately minimal. It contains only an accessible skip link and router outlet; header/footer/mobile navigation are not implemented before design approval.

## `src/app/app.component.ts`

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LocaleService } from './core/i18n/locale.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly locale = inject(LocaleService);
}
```

## `src/app/app.component.html`

```html
<a class="skip-link" href="#main-content">{{ locale.translate('app.skipToContent') }}</a> <router-outlet />
```

## `src/app/app.component.scss`

```scss
:host {
  display: block;
  min-height: 100%;
}
```
