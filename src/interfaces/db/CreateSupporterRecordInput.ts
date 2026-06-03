import type { Uuid } from './Uuid';

export interface CreateSupporterRecordInput {
  chatId: Uuid;
  agentName: string;
  name?: string;
  expects?: string;
  context?: string;
}
