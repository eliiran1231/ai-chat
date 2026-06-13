import type { Uuid } from './Uuid';

export interface UpdateChatManagerInput {
  chatId: Uuid;
  managerName?: string;
}