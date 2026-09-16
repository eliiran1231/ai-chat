import { Signal, WritableSignal } from "@angular/core";

export type ReadonlySignals<T> = {
  readonly [K in keyof T as T[K] extends WritableSignal<any> ? K : never]:
    T[K] extends WritableSignal<infer V> ? Signal<V> : never;
};