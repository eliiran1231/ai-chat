import { isWritableSignal, signal, WritableSignal } from '@angular/core';
import { SyncedEntity } from '../classes/SyncedEntity';

interface InternalSyncedSignal<T> extends WritableSignal<T> {
  parent?: SyncedEntity;
  prop?: string;
  lastTaskId?: number;
  sync?(value: any): void;
  set(value: T, uiOnly?: boolean): void;
  update(updater: (value: T) => T, uiOnly?: boolean): void;
}

export interface SyncedSignal<T> extends WritableSignal<T> {
  sync(value: any): void;
  set(value: T, uiOnly?: boolean): void;
  update(updater: (value: T) => T, uiOnly?: boolean): void;
}

export function syncedSignal<T>(initialValue: T): SyncedSignal<T> {
  const internalSignal: InternalSyncedSignal<T> = signal<T>(initialValue);

  internalSignal.sync = (value: any) => {
    clearTimeout(internalSignal.lastTaskId);
    internalSignal.lastTaskId = setTimeout(() => {
      const { parent, prop } = internalSignal;
      if(!(parent && prop)) throw new Error("sync signal couldnt sync, are you sure the synced signal exists under a synced entity?");
      parent?.['onChanges'](parent, prop, value);
    }, 500);
  };

  const oldSet = internalSignal.set;
  internalSignal.set = (value, uiOnly = false) => {
    oldSet(value);
    uiOnly || internalSignal.sync?.(value)
  };

  const oldUpdate = internalSignal.update;
  internalSignal.update = (updater, uiOnly = false) => {
    const newValue = updater(internalSignal());
    oldUpdate(updater);
    uiOnly || internalSignal.sync?.(newValue);
  };

  return internalSignal as SyncedSignal<T>;
}

export function isSyncedSignal(value?: any) {
  return value?.sync && isWritableSignal(value)
}
