import type { IpcMainInvokeEvent } from 'electron';

type IpcHandler<TArgs extends unknown[], TResult> = (
  event: IpcMainInvokeEvent,
  ...args: TArgs
) => Promise<TResult> | TResult;

export function withIpcErrorHandling<TArgs extends unknown[], TResult>(
  handler: IpcHandler<TArgs, TResult>,
): IpcHandler<TArgs, Promise<TResult>> {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error('IPC handler failed.', error);
      throw new Error(error instanceof Error ? error.message : 'Unexpected IPC handler error.');
    }
  };
}
