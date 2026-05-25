import type { Uuid } from './Uuid';

export interface CreateSupporterRecordInput {
  chatId: Uuid;
  agentName: string;
  context?: string;
}
