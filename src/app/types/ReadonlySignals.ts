import { Signal, WritableSignal } from "@angular/core";

export type ReadonlySignals<T> = {
  readonly [K in keyof T as
    K extends "clone"
      ? K
      : T[K] extends (...args: any[]) => any
        ? T[K] extends Signal<any> ? K : never
        : K
  ]:
    T[K] extends WritableSignal<infer V>
      ? Signal<V>
      : T[K];
};