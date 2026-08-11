import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { ElectronService } from './electron.service';
import {
  DEEP_AGENT_CHANNELS,
  type CancelDeepAgentRunRequest,
  type DeepAgentRunEvent,
  type DeleteDeepAgentThreadRequest,
  type StartDeepAgentRunRequest,
  type StartDeepAgentRunResponse,
} from '../../shared/ipc/deep-agent-channels';

export type DeepAgentRunStatus =
  | 'idle'
  | 'running'
  | 'cancelling'
  | 'failed'
  | 'cancelled';

export interface DeepAgentRunState {
  runId?: string;
  status: DeepAgentRunStatus;
  activity?: string;
  error?: string;
  sequence: number;
  requiresReset: boolean;
}

const IDLE_RUN_STATE: DeepAgentRunState = {
  status: 'idle',
  sequence: 0,
  requiresReset: false,
};

interface PendingRun {
  chatId: string;
  content: string;
  output: ReplaySubject<string>;
}

@Injectable({ providedIn: 'root' })
export class DeepAgentClientService implements OnDestroy {
  private readonly states = signal<Record<string, DeepAgentRunState>>({});
  private readonly pendingRuns = new Map<string, PendingRun>();
  private readonly unsubscribe: () => void;

  constructor(private readonly electron: ElectronService) {
    this.unsubscribe = this.electron.on<DeepAgentRunEvent>(
      DEEP_AGENT_CHANNELS.event,
      (event) => this.handleEvent(event),
    );
  }

  stateFor(chatId: string): DeepAgentRunState {
    return this.states()[chatId] ?? IDLE_RUN_STATE;
  }

  isActive(chatId: string): boolean {
    const status = this.stateFor(chatId).status;
    return status === 'running' || status === 'cancelling';
  }

  startRun(request: Omit<StartDeepAgentRunRequest, 'runId'>): Observable<string> {
    if (this.isActive(request.chatId)) throw new Error('RUN_ALREADY_ACTIVE');

    const runId = crypto.randomUUID();
    const previous = this.stateFor(request.chatId);
    const output = new ReplaySubject<string>(1);
    this.setState(request.chatId, {
      runId,
      status: 'running',
      sequence: 0,
      requiresReset: request.resetThread || previous.requiresReset,
    });

    this.pendingRuns.set(runId, { chatId: request.chatId, content: '', output });

    void this.electron
      .invoke<StartDeepAgentRunResponse>(DEEP_AGENT_CHANNELS.start, {
        ...request,
        runId,
        resetThread: request.resetThread || previous.requiresReset,
      } satisfies StartDeepAgentRunRequest)
      .catch((error) => {
        const pending = this.pendingRuns.get(runId);
        this.pendingRuns.delete(runId);
        const runError = error instanceof Error ? error : new Error(String(error));
        this.setState(request.chatId, {
          runId,
          status: 'failed',
          error: runError.message,
          sequence: 0,
          requiresReset: true,
        });
        pending?.output.error(runError);
      });

    return output.asObservable();
  }

  async cancel(chatId: string): Promise<boolean> {
    const state = this.stateFor(chatId);
    if (!state.runId || state.status !== 'running') return false;
    this.setState(chatId, { ...state, status: 'cancelling' });
    return this.electron.invoke<boolean>(DEEP_AGENT_CHANNELS.cancel, {
      runId: state.runId,
    } satisfies CancelDeepAgentRunRequest);
  }

  async deleteThread(chatId: string): Promise<void> {
    await this.electron.invoke<void>(DEEP_AGENT_CHANNELS.deleteThread, {
      chatId,
    } satisfies DeleteDeepAgentThreadRequest);
    this.clear(chatId);
  }

  clear(chatId: string): void {
    this.states.update((states) => {
      const { [chatId]: _removed, ...rest } = states;
      return rest;
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe();
    for (const pending of this.pendingRuns.values()) {
      pending.output.error(new Error('Deep Agent client was destroyed.'));
    }
    this.pendingRuns.clear();
  }

  private handleEvent(event: DeepAgentRunEvent): void {
    const state = this.stateFor(event.chatId);
    if (state.runId !== event.runId || event.sequence <= state.sequence) return;

    if (event.type === 'token') {
      const pending = this.pendingRuns.get(event.runId);
      if (pending) {
        pending.content = event.reset ? event.text : pending.content + event.text;
        pending.output.next(pending.content);
      }
      this.setState(event.chatId, {
        ...state,
        activity: undefined,
        sequence: event.sequence,
      });
      return;
    }

    if (event.type === 'tool-started') {
      this.setState(event.chatId, {
        ...state,
        activity: `Using ${event.toolName}...`,
        sequence: event.sequence,
      });
      return;
    }

    if (event.type === 'tool-finished') {
      this.setState(event.chatId, {
        ...state,
        activity: event.success ? `Finished ${event.toolName}` : `${event.toolName} failed`,
        sequence: event.sequence,
      });
      return;
    }

    const pending = this.pendingRuns.get(event.runId);
    this.pendingRuns.delete(event.runId);
    if (event.type === 'completed') {
      if (pending && pending.content !== event.content) pending.output.next(event.content);
      pending?.output.complete();
      this.setState(event.chatId, {
        status: 'idle',
        sequence: event.sequence,
        requiresReset: false,
      });
      return;
    }

    if (event.type === 'cancelled') {
      this.setState(event.chatId, {
        ...state,
        status: 'cancelled',
        sequence: event.sequence,
        requiresReset: true,
      });
      pending?.output.error(new Error('DEEP_AGENT_RUN_CANCELLED'));
      return;
    }

    this.setState(event.chatId, {
      ...state,
      status: 'failed',
      error: event.message,
      sequence: event.sequence,
      requiresReset: true,
    });
    pending?.output.error(new Error(event.message));
  }

  private setState(chatId: string, state: DeepAgentRunState): void {
    this.states.update((states) => ({ ...states, [chatId]: state }));
  }
}
