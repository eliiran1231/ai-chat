import type { MessageType } from '../../classes/Message';
import type { ValidatorSpec } from '../validation/ValidatorSpec';

export interface CreateMessageRecordInput {
  chatId: number;
  from?: 'client' | 'supporter';
  messageType?: MessageType;
  value: string;
  tag?: string;
  time: string;
  isRead: boolean;
  possibleAnswers?: string[];
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
