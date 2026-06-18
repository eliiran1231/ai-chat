import type { Attachment, MessageType } from '../../classes/Message';
import type { Uuid } from './Uuid';
import type { ValidatorSpec } from '../validation/ValidatorSpec';
import type { MessageStatus } from '../../enums/MessagesStatus';

export interface CreateMessageRecordInput {
  id?: Uuid;
  chatId: Uuid;
  from?: 'client' | 'supporter';
  messageType?: MessageType;
  value: string;
  tag?: string;
  time: string;
  editedAt?: string;
  status: MessageStatus;
  editable: boolean;
  deletable: boolean;
  attachment?: Attachment;
  possibleAnswers?: string[];
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
