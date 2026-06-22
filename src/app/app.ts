import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GeneralSettingsService } from './services/general-settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly generalSettings = inject(GeneralSettingsService);

  constructor() {
    this.generalSettings.load();
  }
}
