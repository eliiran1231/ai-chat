import type { Uuid } from './Uuid';

export interface SupporterRecord {
  id: Uuid;
  chatId: Uuid;
  agentName: string;
  context: string;
  createdAt: string;
  updatedAt: string;
}
