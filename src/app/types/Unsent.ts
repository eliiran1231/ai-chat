import { Signal, WritableSignal } from "@angular/core";

export type Unsent<T> = {
  readonly [K in keyof T]:
    K extends 'Id'
      ? T[K]
      : T[K] extends WritableSignal<infer V>
        ? Signal<V>
        : T[K];
};