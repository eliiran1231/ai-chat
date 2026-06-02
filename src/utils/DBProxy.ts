export const createDbProxy = (target: any) =>
  new Proxy(target, {
    set(target, prop, newValue) {
      if (prop == 'id' && target.id) return false;
      target[prop] = newValue;
      if(prop == 'onChanges' || prop == "id") return true;
      target.onChanges?.(target, prop, newValue);
      return true;
    },
  });
