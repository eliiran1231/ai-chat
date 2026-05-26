import type { Uuid } from './Uuid';

export interface UpdateChatTitleInput {
  chatId: Uuid;
  name: string;
}
