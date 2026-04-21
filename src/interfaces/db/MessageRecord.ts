import type { Attachment, MessageType } from '../../classes/Message';
import type { ValidatorSpec } from '../validation/ValidatorSpec';

export interface MessageRecord {
  id: number;
  chatId: number;
  from?: 'client' | 'supporter';
  messageType?: MessageType;
  value: string;
  tag?: string;
  time: string;
  isRead: boolean;
  attachment?: Attachment;
  possibleAnswers?: string[];
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
