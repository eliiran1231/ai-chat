import { Injectable, inject, signal } from '@angular/core';

import { ElectronService } from './electron.service';

const FALLBACK_VERSION = 'Unavailable';

@Injectable({
  providedIn: 'root',
})
export class AppInfoService {
  private readonly electronService = inject(ElectronService);

  readonly version = signal(FALLBACK_VERSION);

  constructor() {
    void this.loadVersion();
  }

  private async loadVersion(): Promise<void> {
    if (!this.electronService.isElectronAvailable()) {
      return;
    }

    try {
      this.version.set(await this.electronService.invoke<string>('system:getAppVersion'));
    } catch (error) {
      console.warn('Unable to load the application version.', error);
    }
  }
}
