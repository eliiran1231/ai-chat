export type DBEntityChangeHandler = (
  target?: any,
  prop?: string | Symbol,
  newValue?: any,
) => void | Promise<void>;

export class DBEntity {
  private dbChangesEnabled = false;
  private onChanges: DBEntityChangeHandler = () => {};
  private lastTaskId: number = 0;

  constructor() {
    return new Proxy(this, {
      set: (target, prop, newValue) => {
        const dbTarget = target as DBEntity & { id?: unknown };
        if (prop === 'id' && 'id' in target && dbTarget.id) return false;
        Reflect.set(target, prop, newValue);
        if (this.shouldEmitDbChange(prop)) {
          this.debounceOnChanges(target, prop, newValue)
        }
        return true;
      },
    });
  }

  private debounceOnChanges(target: this, prop: string | symbol, newValue: any) {
    clearTimeout(this.lastTaskId);
    this.lastTaskId = setTimeout(async () => {
      await this.onChanges?.(target, prop, newValue);
      this.lastTaskId = 0;
    }, 500);
  }

  protected enableDbChanges(): void {
    this.dbChangesEnabled = true;
  }

  protected disableDbChanges(): void {
    this.dbChangesEnabled = false;
  }

  setSaveChangesHandler(handler: DBEntityChangeHandler): void {
    this.onChanges = handler;
  }

  async saveChanges(): Promise<void> {
    await this.onChanges?.(this, 'all');
  }

  protected shouldEmitDbChange(prop: string | symbol): boolean {
    return (
      this.dbChangesEnabled &&
      prop !== 'id' &&
      prop !== 'onChanges' &&
      prop !== 'dbChangesEnabled' &&
      prop !== 'saveChangesHandler'
    );
  }
}
