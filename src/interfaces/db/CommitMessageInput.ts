import type { Attachment, MessageType } from '../../classes/Message';
import type { AnswerSelectionMode } from '../../classes/Question';
import type { Uuid } from './Uuid';
import type { ValidatorSpec } from '../validation/ValidatorSpec';

export interface CommitMessageInput {
  id: Uuid;
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
  answerSelectionMode?: AnswerSelectionMode;
  validatorSpec?: ValidatorSpec;
  validationErrorMessage?: string;
}
