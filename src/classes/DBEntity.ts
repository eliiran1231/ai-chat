export type DBEntityChangeHandler = (
  target?: any,
  prop?: string | Symbol,
  newValue?: any,
) => void | Promise<void>;

const dbProperties = new WeakMap<object, Set<string | symbol>>();

export function dbProperty(target: object, propertyKey: string | symbol): void {
  const entityProperties = dbProperties.get(target) ?? new Set<string | symbol>();
  entityProperties.add(propertyKey);
  dbProperties.set(target, entityProperties);
}

export class DBEntity {
  private dbChangesEnabled = false;
  private onChanges: DBEntityChangeHandler = () => {};
  private lastTaskId?: ReturnType<typeof setTimeout>;
  uiInstance = this;

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

  private isDbProperty(prop: string | symbol): boolean {
    let prototype = Object.getPrototypeOf(this);
    while (prototype) {
      if (dbProperties.get(prototype)?.has(prop)) {
        return true;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    return false;
  }

  protected shouldEmitDbChange(prop: string | symbol): boolean {
    return (
      this.dbChangesEnabled &&
      this.isDbProperty(prop) &&
      prop !== 'id' &&
      prop !== 'onChanges' &&
      prop !== 'dbChangesEnabled' &&
      prop !== 'saveChangesHandler'
    );
  }
}
