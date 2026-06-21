import { isSyncedSignal } from '../signals/syncedSignal';

export type SyncedEntityChangeHandler = (
  target?: any,
  prop?: string | Symbol,
  newValue?: any,
) => void | Promise<void>;

export class SyncedEntity {
  private onChanges: SyncedEntityChangeHandler = () => {};

  constructor() {
    for (const [key, value] of Object.entries(this)) {
      if (isSyncedSignal(value)) {
        value.parent = this;
        value.prop = key;
      }
    }
  }

  setSaveChangesHandler(handler: SyncedEntityChangeHandler): void {
    this.onChanges = handler;
  }

  async saveChanges(): Promise<void> {
    await this.onChanges?.(this, 'all');
  }
}
