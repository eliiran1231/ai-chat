import { Answer } from '../classes/Answer';
import { Chat } from '../classes/Chat';
import { Message, MessageOptions } from '../classes/Message';
import { coerceValidatorSpec } from '../classes/MessageValidator';
import { MessageSource } from '../classes/MessageSource';
import { Question, QuestionOptions } from '../classes/Question';
import type { SqliteProvider } from '../chat-providers/SqliteProvider';
import { DbService } from '../services/db.service';
import { MessageRecord } from '../interfaces/db/MessageRecord';

export class SqliteMessagesSource extends MessageSource {
  constructor(
    chat: Chat,
    private readonly dbService: DbService,
    private readonly commitMessageChanges: (message: Message) => Promise<any>,
  ) {
    super(chat);
  }

  protected override async getMessages(start: number, end: number): Promise<Message[]> {
    const records = await this.dbService.getChatMessages(this.chat.id(), start, end - start);
    return records.map(record => this.hydrateMessage(record));
  }

  private hydrateMessage(record: MessageRecord): Message {
    const options: MessageOptions = {
      ...record,
      time: new Date(record.time),
      editedAt: record.editedAt ? new Date(record.editedAt) : undefined,
    };
    const messageType = record.messageType ?? 'message';
    const message = messageType === 'question'
      ? this.hydrateQuestion(record, options)
      : messageType === 'answer'
        ? new Answer(record.value, options)
        : new Message(record.value, options);

    message.setChat(this.chat);
    message.setSaveChangesHandler(target => void this.commitMessageChanges(target));
    return message;
  }

  private hydrateQuestion(record: MessageRecord, options: MessageOptions): Question {
    const validatorSpec = coerceValidatorSpec(record.validatorSpec);
    const questionOptions: QuestionOptions = {
      ...options,
      possibleAnswers: record.possibleAnswers,
      answerSelectionMode: record.answerSelectionMode,
      validationErrorMessage: record.validationErrorMessage,
      validator: validatorSpec,
    };
    const question = new Question(record.value, questionOptions);

    if (!validatorSpec && record.validationErrorMessage) {
      question.validationErrorMessage = new Message(record.validationErrorMessage);
    }

    return question;
  }
}
