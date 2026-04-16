import { Injectable, NgZone } from '@angular/core';

declare global {
  interface Window {
    electronAPI?: {
      invoke: <T>(channel: string, payload?: unknown) => Promise<T>;
      onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  constructor(private ngZone: NgZone) {}

  isElectronAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.electronAPI?.invoke === 'function';
  }

  async invoke<T>(channel: string, payload?: unknown): Promise<T> {
    if (!this.isElectronAvailable()) {
      return Promise.reject(new Error('Electron API is not available.'));
    }
    try {
      const result = await window.electronAPI!.invoke<T>(channel, payload);
      return this.ngZone.runTask(() => result);
    } catch (error) {
      return this.ngZone.runTask(() => Promise.reject(error));
    }
  }
}
