import type { Attachment, MessageType } from '../../classes/Message';
import type { Uuid } from './Uuid';
import type { ValidatorSpec } from '../validation/ValidatorSpec';
import type { PersistedAnswerOptions } from '../../classes/Question';

export interface MessageRecord {
  id: Uuid;
  chatId: Uuid;
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
  answerOptions?: PersistedAnswerOptions;
  selectedAnswers?: string[];
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
