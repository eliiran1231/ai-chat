export type DBEntityChangeHandler = (
  target: any,
  prop: string | Symbol,
  newValue: any,
) => void;

export type DBEntitySaveHandler = () => Promise<void> | void;

export class DBEntity {
  private dbChangesEnabled = false;
  private saveChangesHandler?: DBEntitySaveHandler;
  onChanges: DBEntityChangeHandler = () => {};

  constructor() {
    return new Proxy(this, {
      set: (target, prop, newValue) => {
        const dbTarget = target as DBEntity & { id?: unknown };
        if (prop === 'id' && 'id' in target && dbTarget.id) return false;
        Reflect.set(target, prop, newValue);
        if (prop !== 'id' && this.shouldEmitDbChange(prop)) {
          this.onChanges?.(target, prop, newValue);
        }
        return true;
      },
    });
  }

  protected enableDbChanges(): void {
    this.dbChangesEnabled = true;
  }

  protected disableDbChanges(): void {
    this.dbChangesEnabled = false;
  }

  setSaveChangesHandler(handler: DBEntitySaveHandler): void {
    this.saveChangesHandler = handler;
  }

  async saveChanges(): Promise<void> {
    await this.saveChangesHandler?.();
  }

  protected shouldEmitDbChange(prop: string | Symbol): boolean {
    return (
      this.dbChangesEnabled &&
      prop !== 'onChanges' &&
      prop !== 'dbChangesEnabled' &&
      prop !== 'saveChangesHandler'
    );
  }
}
