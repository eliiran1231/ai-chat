export const createDbProxy = <T extends object>(target: T): T =>
  new Proxy(target, {
    set(target, prop, newValue) {
      const dbTarget = target as any;
      if (prop == 'id' && 'id' in target && dbTarget.id) return false;
      Reflect.set(target, prop, newValue);
      if (prop == 'id') return true;
      if (typeof dbTarget.shouldEmitDbChange === 'function' && dbTarget.shouldEmitDbChange(prop)) {
        dbTarget.onChanges?.(target, prop, newValue);
      }
      return true;
    },
  });
