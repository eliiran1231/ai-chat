export type DBEntityChangeHandler = (
  target?: any,
  prop?: string | Symbol,
  newValue?: any,
) => void | Promise<void>;

export class DBEntity {
  private dbChangesEnabled = false;
  private onChanges: DBEntityChangeHandler = () => {};
  private lastTaskId?: ReturnType<typeof setTimeout>;

  constructor() {
    return new Proxy(this, {
      set: (target, prop, newValue, receiver) => {
        const dbTarget = target as DBEntity & { id?: unknown };
        if (prop === 'id' && 'id' in target && dbTarget.id) return true;
        const previousValue = Reflect.get(target, prop, receiver);
        const wasSet = Reflect.set(target, prop, newValue, receiver);
        if (wasSet && previousValue !== newValue && target.shouldEmitDbChange(prop)) {
          target.debounceOnChanges(receiver as this, prop, newValue);
        }
        return wasSet;
      },
    });
  }

  private debounceOnChanges(target: this, prop: string | symbol, newValue: any) {
    clearTimeout(this.lastTaskId);
    this.lastTaskId = setTimeout(async () => {          
      try {
        await target.onChanges?.(target, prop, newValue);
      } catch (error) {
        console.error(`Failed to save DBEntity after ${String(prop)} changed.`, error);
      } finally {
        this.lastTaskId = undefined;
      }
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
