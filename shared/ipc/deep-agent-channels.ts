export const DEEP_AGENT_CHANNELS = {
  start: 'deep-agent:start',
  cancel: 'deep-agent:cancel',
  deleteThread: 'deep-agent:deleteThread',
  event: 'deep-agent:event',
} as const;

export type DeepAgentMessageRole = 'user' | 'assistant';

export interface DeepAgentHistoryMessage {
  id: string;
  role: DeepAgentMessageRole;
  content: string;
}

export interface StartDeepAgentRunRequest {
  runId: string;
  chatId: string;
  latestMessage: DeepAgentHistoryMessage;
  history: DeepAgentHistoryMessage[];
  resetThread?: boolean;
}

export interface StartDeepAgentRunResponse {
  runId: string;
}

export interface CancelDeepAgentRunRequest {
  runId: string;
}

export interface DeleteDeepAgentThreadRequest {
  chatId: string;
}

interface DeepAgentEventBase {
  runId: string;
  chatId: string;
  sequence: number;
}

export interface DeepAgentTokenEvent extends DeepAgentEventBase {
  type: 'token';
  text: string;
  reset: boolean;
}

export interface DeepAgentToolStartedEvent extends DeepAgentEventBase {
  type: 'tool-started';
  toolCallId: string;
  toolName: string;
}

export interface DeepAgentToolFinishedEvent extends DeepAgentEventBase {
  type: 'tool-finished';
  toolCallId: string;
  toolName: string;
  success: boolean;
}

export interface DeepAgentCompletedEvent extends DeepAgentEventBase {
  type: 'completed';
  content: string;
  model?: string;
}

export interface DeepAgentFailedEvent extends DeepAgentEventBase {
  type: 'failed';
  code: string;
  message: string;
  retryable: boolean;
}

export interface DeepAgentCancelledEvent extends DeepAgentEventBase {
  type: 'cancelled';
}

export type DeepAgentRunEvent =
  | DeepAgentTokenEvent
  | DeepAgentToolStartedEvent
  | DeepAgentToolFinishedEvent
  | DeepAgentCompletedEvent
  | DeepAgentFailedEvent
  | DeepAgentCancelledEvent;
