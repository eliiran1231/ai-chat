import { Injectable, NgZone } from '@angular/core';

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

  on<T>(channel: string, listener: (payload: T) => void): () => void {
    if (!this.isElectronAvailable() || !window.electronAPI?.on) return () => {};
    return window.electronAPI.on<T>(channel, (payload) => this.ngZone.run(() => listener(payload)));
  }
}
