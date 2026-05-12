import type { Attachment, MessageType } from '../../classes/Message';
import type { ValidatorSpec } from '../validation/ValidatorSpec';

export interface CreateMessageRecordInput {
  id?: number;
  chatId: number;
  from?: 'client' | 'supporter';
  messageType?: MessageType;
  value: string;
  tag?: string;
  time: string;
  editedAt?: string;
  isRead: boolean;
  editable: boolean;
  deletable: boolean;
  attachment?: Attachment;
  possibleAnswers?: string[];
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
