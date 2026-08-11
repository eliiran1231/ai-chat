import { app } from 'electron';
import * as path from 'node:path';
import { AIMessageChunk, ToolMessage, tool } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { createDeepAgent, StateBackend } from 'deepagents';
import { z } from 'zod';
import { dbService, type DbService } from './db.service.js';
import {
  authenticationService,
  type ServerAuthenticationService,
} from './server-authentication.service.js';
import type {
  DeepAgentHistoryMessage,
  DeepAgentRunEvent,
  StartDeepAgentRunRequest,
  StartDeepAgentRunResponse,
} from '../shared/ipc/deep-agent-channels.js';

interface DeepAgentGraphLike {
  stream(
    input: { messages: Array<{ role: 'user' | 'assistant'; content: string }> },
    config: Record<string, unknown>,
  ): Promise<AsyncIterable<unknown>>;
}

interface DeepAgentCheckpointerLike {
  getTuple(config: Record<string, unknown>): Promise<unknown | undefined>;
  deleteThread(threadId: string): Promise<void>;
  db?: { close(): void };
}

interface ActiveRun {
  runId: string;
  chatId: string;
  senderId: number;
  threadId: string;
  sequence: number;
  controller: AbortController;
  emit: (event: DeepAgentRunEvent) => void;
}

type WithoutEventEnvelope<T> = T extends unknown
  ? Omit<T, 'runId' | 'chatId' | 'sequence'>
  : never;
type DeepAgentEventPayload = WithoutEventEnvelope<DeepAgentRunEvent>;

export interface DeepAgentServiceOptions {
  graph?: DeepAgentGraphLike;
  checkpointer?: DeepAgentCheckpointerLike;
  checkpointPath?: string;
}

export class DeepAgentService {
  private graph?: DeepAgentGraphLike;
  private checkpointer?: DeepAgentCheckpointerLike;
  private checkpointPath?: string;
  private readonly activeRunsByChat = new Map<string, ActiveRun>();
  private readonly activeRunsById = new Map<string, ActiveRun>();
  private readonly dirtyThreads = new Set<string>();

  constructor(
    private readonly authentication: Pick<ServerAuthenticationService, 'getCurrentUser'> =
      authenticationService,
    private readonly database: Pick<DbService, 'getSyncState'> = dbService,
    options: DeepAgentServiceOptions = {},
  ) {
    this.graph = options.graph;
    this.checkpointer = options.checkpointer;
    this.checkpointPath = options.checkpointPath;
  }

  initialize(): void {
    if (this.graph && this.checkpointer) return;

    this.checkpointPath ??= path.join(
      app.getPath('userData'),
      'deepagents-checkpoints.sqlite',
    );
    this.checkpointer ??= SqliteSaver.fromConnString(this.checkpointPath);

    const model = new ChatOpenAI({
      model: process.env['DEEP_AGENT_MODEL'] ?? 'google/gemma-3-4b',
      apiKey: process.env['DEEP_AGENT_API_KEY'] ?? 'lm-studio',
      temperature: 0,
      streamUsage: false,
      configuration: {
        baseURL: process.env['DEEP_AGENT_BASE_URL'] ?? 'http://127.0.0.1:1234/v1',
      },
    });

    const getSyncStatus = tool(async () => JSON.stringify(this.database.getSyncState()), {
      name: 'get_sync_status',
      description: 'Read the current PowerSync connection status for this desktop app.',
      schema: z.object({}),
    });

    this.graph = createDeepAgent({
      name: 'ai-chat-deep-agent',
      model,
      tools: [getSyncStatus],
      systemPrompt:
        'You are the assistant in a desktop chat application. Be concise and helpful. ',
      checkpointer: this.checkpointer as SqliteSaver,
      backend: (runtime) => new StateBackend(),
    }) as DeepAgentGraphLike;
  }

  start(
    request: StartDeepAgentRunRequest,
    senderId: number,
    emit: (event: DeepAgentRunEvent) => void,
  ): StartDeepAgentRunResponse {
    this.assertInitialized();
    this.validateStartRequest(request);

    if (this.activeRunsByChat.has(request.chatId)) {
      throw new Error('RUN_ALREADY_ACTIVE');
    }
    if (this.activeRunsById.has(request.runId)) {
      throw new Error('RUN_ID_ALREADY_EXISTS');
    }

    const run: ActiveRun = {
      runId: request.runId,
      chatId: request.chatId,
      senderId,
      threadId: this.threadId(request.chatId),
      sequence: 0,
      controller: new AbortController(),
      emit,
    };
    this.activeRunsByChat.set(request.chatId, run);
    this.activeRunsById.set(request.runId, run);
    void this.execute(run, request);

    return { runId: request.runId };
  }

  cancel(runId: string, senderId: number): boolean {
    const run = this.activeRunsById.get(runId);
    if (!run || run.senderId !== senderId) return false;
    run.controller.abort();
    this.dirtyThreads.add(run.threadId);
    return true;
  }

  cancelSenderRuns(senderId: number): void {
    for (const run of this.activeRunsById.values()) {
      if (run.senderId === senderId) {
        run.controller.abort();
        this.dirtyThreads.add(run.threadId);
      }
    }
  }

  async deleteThread(chatId: string): Promise<void> {
    this.assertInitialized();
    const active = this.activeRunsByChat.get(chatId);
    active?.controller.abort();
    const threadId = this.threadId(chatId);
    this.dirtyThreads.delete(threadId);
    await this.checkpointer!.deleteThread(threadId);
  }

  close(): void {
    for (const run of this.activeRunsById.values()) run.controller.abort();
    this.activeRunsByChat.clear();
    this.activeRunsById.clear();
    this.checkpointer?.db?.close();
    this.graph = undefined;
    this.checkpointer = undefined;
  }

  private async execute(run: ActiveRun, request: StartDeepAgentRunRequest): Promise<void> {
    let completed = false;
    try {
      if (request.resetThread || this.dirtyThreads.has(run.threadId)) {
        await this.checkpointer!.deleteThread(run.threadId);
        this.dirtyThreads.delete(run.threadId);
      }

      const config = {
        configurable: { thread_id: run.threadId },
        recursionLimit: 100,
        signal: run.controller.signal,
        streamMode: 'messages',
        subgraphs: true,
      };
      const existingCheckpoint = await this.checkpointer!.getTuple(config);
      const sourceMessages = existingCheckpoint ? [request.latestMessage] : request.history;
      const messages = this.normalizeMessages(sourceMessages, request.latestMessage);
      const stream = await this.graph!.stream({ messages }, config);

      let finalContent = '';
      let currentMainMessageId: string | undefined;
      let modelName: string | undefined;
      const startedTools = new Set<string>();

      for await (const raw of stream) {
        if (run.controller.signal.aborted) break;
        const parsed = this.parseStreamEvent(raw);
        if (!parsed) continue;
        const { namespace, message } = parsed;
        const isNestedSubgraph = this.isNestedSubgraph(namespace);

        if (AIMessageChunk.isInstance(message)) {
          for (const [index, call] of (message.tool_call_chunks ?? []).entries()) {
            const toolCallId = call.id ?? `${call.name ?? 'tool'}:${index}`;
            if (call.name && !startedTools.has(toolCallId)) {
              startedTools.add(toolCallId);
              this.emit(run, {
                type: 'tool-started',
                toolCallId,
                toolName: call.name,
              });
            }
          }

          const text = this.messageText(message);
          if (!isNestedSubgraph && text) {
            const messageId = message.id ?? 'main';
            const reset = currentMainMessageId !== undefined && currentMainMessageId !== messageId;
            if (currentMainMessageId !== messageId) {
              currentMainMessageId = messageId;
              finalContent = '';
            }
            finalContent += text;
            modelName = this.modelName(message.response_metadata) ?? modelName;
            this.emit(run, { type: 'token', text, reset });
          }
        } else if (ToolMessage.isInstance(message)) {
          const toolCallId = message.tool_call_id;
          this.emit(run, {
            type: 'tool-finished',
            toolCallId,
            toolName: message.name ?? 'tool',
            success: message.status !== 'error',
          });
        }
      }

      if (run.controller.signal.aborted) {
        this.dirtyThreads.add(run.threadId);
        this.emit(run, { type: 'cancelled' });
        return;
      }
      if (!finalContent.trim()) {
        throw new Error('The model completed without returning an assistant message.');
      }

      completed = true;
      this.emit(run, {
        type: 'completed',
        content: finalContent,
        model: modelName,
      });
    } catch (error) {
      this.dirtyThreads.add(run.threadId);
      if (run.controller.signal.aborted) {
        this.emit(run, { type: 'cancelled' });
      } else {
        this.emit(run, {
          type: 'failed',
          code: this.errorCode(error),
          message: this.errorMessage(error),
          retryable: true,
        });
      }
    } finally {
      if (!completed && run.controller.signal.aborted) this.dirtyThreads.add(run.threadId);
      this.activeRunsByChat.delete(run.chatId);
      this.activeRunsById.delete(run.runId);
    }
  }

  private emit(
    run: ActiveRun,
    event: DeepAgentEventPayload,
  ): void {
    run.emit({
      ...event,
      runId: run.runId,
      chatId: run.chatId,
      sequence: ++run.sequence,
    } as DeepAgentRunEvent);
  }

  private parseStreamEvent(
    raw: unknown,
  ): { namespace: string[]; message: unknown } | undefined {
    if (!Array.isArray(raw) || raw.length < 2) return undefined;

    if (Array.isArray(raw[0])) {
      const namespace = this.normalizeNamespace(raw[0]);
      if (raw[1] === 'messages' && Array.isArray(raw[2])) {
        return { namespace, message: raw[2][0] };
      }
      if (Array.isArray(raw[1])) {
        return { namespace, message: raw[1][0] };
      }
      return undefined;
    }

    if (raw[0] === 'messages' && Array.isArray(raw[1])) {
      return { namespace: [], message: raw[1][0] };
    }

    return undefined;
  }

  private normalizeNamespace(namespace: unknown[]): string[] {
    return namespace.filter((item): item is string => typeof item === 'string');
  }

  private isNestedSubgraph(namespace: string[]): boolean {
    return namespace.length > 1;
  }

  private messageText(message: AIMessageChunk): string {
    if (message.text) return message.text;
    const content = message.content;
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (!block || typeof block !== 'object') return '';
        const text = (block as Record<string, unknown>)['text'];
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }

  private normalizeMessages(
    history: DeepAgentHistoryMessage[],
    latestMessage: DeepAgentHistoryMessage,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const source = history.length ? history : [latestMessage];
    const normalized = source
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({ role: message.role, content: message.content }));
    if (!normalized.length) throw new Error('EMPTY_AGENT_HISTORY');
    return normalized;
  }

  private validateStartRequest(request: StartDeepAgentRunRequest): void {
    if (!request.runId || !request.chatId) throw new Error('INVALID_RUN_REQUEST');
    if (request.latestMessage.role !== 'user' || !request.latestMessage.content.trim()) {
      throw new Error('INVALID_LATEST_MESSAGE');
    }
  }

  private threadId(chatId: string): string {
    const userId = this.authentication.getCurrentUser()?.id ?? 'local';
    return `deep-agent:${userId}:${chatId}`;
  }

  private modelName(metadata: Record<string, unknown>): string | undefined {
    const value = metadata['model_name'] ?? metadata['model'];
    return typeof value === 'string' ? value : undefined;
  }

  private errorCode(error: unknown): string {
    const message = this.errorMessage(error);
    if (message.includes('tool') || message.includes('function')) return 'MODEL_TOOL_CALL_ERROR';
    if (message.includes('fetch') || message.includes('connect') || message.includes('ECONN')) {
      return 'MODEL_ENDPOINT_UNAVAILABLE';
    }
    return 'DEEP_AGENT_RUN_FAILED';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private assertInitialized(): void {
    if (!this.graph || !this.checkpointer) throw new Error('DEEP_AGENT_NOT_INITIALIZED');
  }
}

export const deepAgentService = new DeepAgentService();
