export interface ElectronAPI {
  invoke: <T>(channel: string, payload?: unknown) => Promise<T>;
  on: <T>(channel: string, listener: (payload: T) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
