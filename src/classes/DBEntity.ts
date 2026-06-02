import { createDbProxy } from '../utils/DBProxy';

export type DBEntityChangeHandler = (
  target: any,
  prop: string | Symbol,
  newValue: any,
) => void;

export class DBEntity {
  private dbChangesEnabled = false;
  onChanges: DBEntityChangeHandler = () => {};

  constructor() {
    return createDbProxy(this);
  }

  protected enableDbChanges(): void {
    this.dbChangesEnabled = true;
  }

  protected disableDbChanges(): void {
    this.dbChangesEnabled = false;
  }

  shouldEmitDbChange(prop: string | Symbol): boolean {
    return this.dbChangesEnabled && prop !== 'onChanges' && prop !== 'dbChangesEnabled';
  }
}
