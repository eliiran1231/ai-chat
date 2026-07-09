import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ElectronService } from './electron.service';
import { DeepAgentClientService } from './deep-agent-client.service';
import {
  DEEP_AGENT_CHANNELS,
  type DeepAgentRunEvent,
} from '../../shared/ipc/deep-agent-channels';

describe('DeepAgentClientService', () => {
  function setup() {
    let listener: ((event: DeepAgentRunEvent) => void) | undefined;
    const electron = {
      invoke: vi.fn(async (channel: string, payload: { runId?: string }) => {
        if (channel === DEEP_AGENT_CHANNELS.start) return { runId: payload.runId };
        return true;
      }),
      on: vi.fn((_channel: string, callback: (event: DeepAgentRunEvent) => void) => {
        listener = callback;
        return vi.fn();
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        DeepAgentClientService,
        { provide: ElectronService, useValue: electron },
      ],
    });
    return {
      service: TestBed.inject(DeepAgentClientService),
      electron,
      emit: (event: DeepAgentRunEvent) => listener?.(event),
    };
  }

  const baseRequest = {
    chatId: 'chat-1',
    latestMessage: { id: 'message-1', role: 'user' as const, content: 'Hello' },
    history: [{ id: 'message-1', role: 'user' as const, content: 'Hello' }],
  };

  it('streams a transient draft and resolves only the completed content', async () => {
    const { service, electron, emit } = setup();
    const completion = service.startRun(baseRequest);
    await vi.waitFor(() => expect(electron.invoke).toHaveBeenCalled());
    const runId = service.stateFor('chat-1').runId!;

    emit({ type: 'token', runId, chatId: 'chat-1', sequence: 1, text: 'Hel', reset: false });
    emit({ type: 'token', runId, chatId: 'chat-1', sequence: 2, text: 'lo', reset: false });
    expect(service.stateFor('chat-1').draft).toBe('Hello');

    emit({ type: 'completed', runId, chatId: 'chat-1', sequence: 3, content: 'Hello' });

    await expect(completion).resolves.toBe('Hello');
    expect(service.stateFor('chat-1').requiresReset).toBe(false);
  });

  it('ignores stale events and resets the draft for a new assistant message', async () => {
    const { service, electron, emit } = setup();
    const completion = service.startRun(baseRequest);
    await vi.waitFor(() => expect(electron.invoke).toHaveBeenCalled());
    const runId = service.stateFor('chat-1').runId!;

    emit({ type: 'token', runId, chatId: 'chat-1', sequence: 2, text: 'Old', reset: false });
    emit({ type: 'token', runId, chatId: 'chat-1', sequence: 1, text: 'Ignored', reset: false });
    emit({ type: 'token', runId, chatId: 'chat-1', sequence: 3, text: 'Final', reset: true });

    expect(service.stateFor('chat-1').draft).toBe('Final');
    emit({ type: 'completed', runId, chatId: 'chat-1', sequence: 4, content: 'Final' });
    await expect(completion).resolves.toBe('Final');
  });

  it('marks failed and cancelled runs for checkpoint rebuilding', async () => {
    const failed = setup();
    const failedCompletion = failed.service.startRun(baseRequest);
    await vi.waitFor(() => expect(failed.electron.invoke).toHaveBeenCalled());
    const failedRunId = failed.service.stateFor('chat-1').runId!;
    failed.emit({
      type: 'failed',
      runId: failedRunId,
      chatId: 'chat-1',
      sequence: 1,
      code: 'MODEL_ENDPOINT_UNAVAILABLE',
      message: 'offline',
      retryable: true,
    });

    await expect(failedCompletion).rejects.toThrow('offline');
    expect(failed.service.stateFor('chat-1')).toMatchObject({
      status: 'failed',
      requiresReset: true,
    });

    TestBed.resetTestingModule();
    const cancelled = setup();
    const cancelledCompletion = cancelled.service.startRun(baseRequest);
    await vi.waitFor(() => expect(cancelled.electron.invoke).toHaveBeenCalled());
    const cancelledRunId = cancelled.service.stateFor('chat-1').runId!;
    cancelled.emit({
      type: 'cancelled',
      runId: cancelledRunId,
      chatId: 'chat-1',
      sequence: 1,
    });

    await expect(cancelledCompletion).rejects.toThrow('DEEP_AGENT_RUN_CANCELLED');
    expect(cancelled.service.stateFor('chat-1').status).toBe('cancelled');
  });
});
