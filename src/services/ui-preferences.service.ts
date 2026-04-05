import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiPreferencesService {
  readonly renderUserMarkdown = signal(false);

  setRenderUserMarkdown(enabled: boolean): void {
    this.renderUserMarkdown.set(enabled);
  }
}
