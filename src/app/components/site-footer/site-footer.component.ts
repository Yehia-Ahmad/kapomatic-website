import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GeneralSettingsService } from '../../services/general-settings.service';
import { LocalizationService } from '../../services/localization.service';
import { UrlService } from '../../services/url.service';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './site-footer.component.html'
})
export class SiteFooterComponent {
  protected readonly generalSettings = inject(GeneralSettingsService);
  protected readonly localization = inject(LocalizationService);
  protected readonly urls = inject(UrlService);
}
