import { Component, HostBinding, inject } from '@angular/core';
import { HomeComponent } from './home/home-component';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-root',
  imports: [HomeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly language = inject(LanguageService);

  @HostBinding('attr.dir')
  get direction(): string {
    return this.language.direction();
  }

  @HostBinding('attr.lang')
  get lang(): string {
    return this.language.currentLanguage();
  }
}
