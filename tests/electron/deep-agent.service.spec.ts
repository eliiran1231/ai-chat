import { AIMessageChunk, ToolMessage } from 'langchain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getPath: () => 'test-user-data' } }));

import { DeepAgentService } from '../../services/deep-agent.service.ts';
import type {
  DeepAgentRunEvent,
  StartDeepAgentRunRequest,
} from '../../shared/ipc/deep-agent-channels.ts';

const userMessage = { id: 'user-1', role: 'user' as const, content: 'Hello' };
const assistantMessage = {
  id: 'assistant-1',
  role: 'assistant' as const,
  content: 'Earlier answer',
};

function request(overrides: Partial<StartDeepAgentRunRequest> = {}): StartDeepAgentRunRequest {
  return {
    runId: crypto.randomUUID(),
    chatId: 'chat-1',
    latestMessage: userMessage,
    history: [assistantMessage, userMessage],
    ...overrides,
  };
}

function streamOf(...events: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

function aiChunk(content: string, id = 'answer-1') {
  return [[], [new AIMessageChunk({ id, content }), {}]];
}

describe('DeepAgentService', () => {
  const authentication = {
    getCurrentUser: vi.fn(() => ({ id: 'user-1', email: 'user@example.com' })),
  };
  const database = {
    getSyncState: vi.fn(() => ({ kind: 'online', connected: true })),
  };
  const checkpointer = {
    getTuple: vi.fn(),
    deleteThread: vi.fn().mockResolvedValue(undefined),
  };
  const graph = {
    stream: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    checkpointer.getTuple.mockResolvedValue(undefined);
    checkpointer.deleteThread.mockResolvedValue(undefined);
  });

  function createService() {
    const service = new DeepAgentService(authentication, database as never, {
      graph,
      checkpointer,
    });
    service.initialize();
    return service;
  }

  it('bootstraps the first thread from visible history and emits ordered events', async () => {
    graph.stream.mockResolvedValue(
      streamOf(
        [
          [],
          [
            new AIMessageChunk({
              id: 'tool-message',
              content: '',
              tool_call_chunks: [
                { id: 'tool-1', name: 'get_sync_status', args: '{}', index: 0 },
              ],
            }),
            {},
          ],
        ],
        [
          [],
          [
            new ToolMessage({
              content: '{"kind":"online"}',
              tool_call_id: 'tool-1',
              name: 'get_sync_status',
            }),
            {},
          ],
        ],
        aiChunk('Hello '),
        aiChunk('there'),
      ),
    );
    const events: DeepAgentRunEvent[] = [];
    const service = createService();

    service.start(request({ runId: 'run-1' }), 7, (event) => events.push(event));

    await vi.waitFor(() => expect(events.at(-1)?.type).toBe('completed'));
    expect(graph.stream).toHaveBeenCalledWith(
      { messages: [{ role: 'assistant', content: 'Earlier answer' }, { role: 'user', content: 'Hello' }] },
      expect.objectContaining({
        configurable: { thread_id: 'deep-agent:user-1:chat-1' },
        streamMode: 'messages',
      }),
    );
    expect(events.map((event) => event.type)).toEqual([
      'tool-started',
      'tool-finished',
      'token',
      'token',
      'completed',
    ]);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5]);
    expect(events.at(-1)).toMatchObject({ type: 'completed', content: 'Hello there' });
  });

  it('sends only the latest message when a checkpoint already exists', async () => {
    checkpointer.getTuple.mockResolvedValue({ checkpoint: {} });
    graph.stream.mockResolvedValue(streamOf(aiChunk('Done')));
    const events: DeepAgentRunEvent[] = [];
    const service = createService();

    service.start(request(), 1, (event) => events.push(event));

    await vi.waitFor(() => expect(events.at(-1)?.type).toBe('completed'));
    expect(graph.stream).toHaveBeenCalledWith(
      { messages: [{ role: 'user', content: 'Hello' }] },
      expect.any(Object),
    );
  });

  it('enforces one active run per chat and scopes cancellation to the sender', async () => {
    graph.stream.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield aiChunk('Working');
        await new Promise((resolve) => setTimeout(resolve, 25));
        yield aiChunk('Done');
      },
    });
    const events: DeepAgentRunEvent[] = [];
    const service = createService();

    service.start(request({ runId: 'run-1' }), 7, (event) => events.push(event));
    expect(() => service.start(request({ runId: 'run-2' }), 7, vi.fn())).toThrow(
      'RUN_ALREADY_ACTIVE',
    );
    expect(service.cancel('run-1', 8)).toBe(false);
    expect(service.cancel('run-1', 7)).toBe(true);

    await vi.waitFor(() => expect(events.at(-1)?.type).toBe('cancelled'));
  });

  it('deletes a dirty checkpoint before the next run', async () => {
    graph.stream
      .mockResolvedValueOnce({
        async *[Symbol.asyncIterator]() {
          yield aiChunk('Working');
          await new Promise((resolve) => setTimeout(resolve, 20));
          yield aiChunk('Ignored');
        },
      })
      .mockResolvedValueOnce(streamOf(aiChunk('Retried')));
    const firstEvents: DeepAgentRunEvent[] = [];
    const secondEvents: DeepAgentRunEvent[] = [];
    const service = createService();

    service.start(request({ runId: 'run-1' }), 1, (event) => firstEvents.push(event));
    service.cancel('run-1', 1);
    await vi.waitFor(() => expect(firstEvents.at(-1)?.type).toBe('cancelled'));

    service.start(request({ runId: 'run-2' }), 1, (event) => secondEvents.push(event));
    await vi.waitFor(() => expect(secondEvents.at(-1)?.type).toBe('completed'));

    expect(checkpointer.deleteThread).toHaveBeenCalledWith('deep-agent:user-1:chat-1');
  });

  it('deletes a chat checkpoint and aborts its active run', async () => {
    graph.stream.mockResolvedValue(streamOf(aiChunk('Done')));
    const service = createService();

    await service.deleteThread('chat-1');

    expect(checkpointer.deleteThread).toHaveBeenCalledWith('deep-agent:user-1:chat-1');
  });
});
