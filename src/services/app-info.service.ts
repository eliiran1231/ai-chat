import { Injectable, computed, inject, signal } from '@angular/core';

import { ElectronService } from './electron.service';

const FALLBACK_VERSION = '';

@Injectable({
  providedIn: 'root',
})
export class AppInfoService {
  private readonly electronService = inject(ElectronService);

  private readonly loadedVersion = signal(FALLBACK_VERSION);
  readonly version = computed(() => this.loadedVersion() || 'common.unavailable');

  constructor() {
    void this.loadVersion();
  }

  private async loadVersion(): Promise<void> {
    if (!this.electronService.isElectronAvailable()) {
      return;
    }

    try {
      this.loadedVersion.set(await this.electronService.invoke<string>('system:getAppVersion'));
    } catch (error) {
      console.warn('Unable to load the application version.', error);
    }
  }
}
