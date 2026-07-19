import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (...args: any[]) => unknown>());
const handle = vi.hoisted(() => vi.fn((channel: string, callback: (...args: any[]) => unknown) => {
  handlers.set(channel, callback);
}));

vi.mock('electron', () => ({
  app: { getPath: () => 'test-user-data' },
  ipcMain: { handle },
}));

import { registerDeepAgentHandlers } from '../../ipc/deep-agent.handler.ts';
import { DEEP_AGENT_CHANNELS } from '../../shared/ipc/deep-agent-channels.ts';

describe('registerDeepAgentHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    handle.mockClear();
  });

  it('streams events only to the renderer that started the run', () => {
    let emit: ((event: object) => void) | undefined;
    const service = {
      start: vi.fn((_request, _senderId, send) => {
        emit = send;
        return { runId: 'run-1' };
      }),
      cancel: vi.fn(),
      deleteThread: vi.fn(),
      cancelSenderRuns: vi.fn(),
    };
    const sender = {
      id: 7,
      send: vi.fn(),
      once: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };
    registerDeepAgentHandlers(service as never);

    const response = handlers.get(DEEP_AGENT_CHANNELS.start)?.(
      { sender },
      { runId: 'run-1', chatId: 'chat-1' },
    );
    emit?.({ type: 'token', runId: 'run-1' });

    expect(response).toEqual({ runId: 'run-1' });
    expect(service.start).toHaveBeenCalledWith(
      expect.any(Object),
      7,
      expect.any(Function),
    );
    expect(sender.send).toHaveBeenCalledWith(DEEP_AGENT_CHANNELS.event, {
      type: 'token',
      runId: 'run-1',
    });
  });

  it('passes the renderer identity to cancellation', () => {
    const service = {
      start: vi.fn(),
      cancel: vi.fn(() => true),
      deleteThread: vi.fn(),
      cancelSenderRuns: vi.fn(),
    };
    registerDeepAgentHandlers(service as never);

    const result = handlers.get(DEEP_AGENT_CHANNELS.cancel)?.(
      { sender: { id: 9 } },
      { runId: 'run-1' },
    );

    expect(result).toBe(true);
    expect(service.cancel).toHaveBeenCalledWith('run-1', 9);
  });
});
