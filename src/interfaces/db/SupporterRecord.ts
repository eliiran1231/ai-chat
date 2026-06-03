import type { Uuid } from './Uuid';

export interface SupporterRecord {
  id: Uuid;
  chatId: Uuid;
  agentName: string;
  name: string;
  expects?: "question" | "answer" | "message";
  context: string;
  createdAt: string;
  updatedAt: string;
}
