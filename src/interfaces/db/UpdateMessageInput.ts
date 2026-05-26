import type { Uuid } from './Uuid';

export interface UpdateMessageInput {
  id: Uuid;
  value: string;
  editedAt: string;
}
