import { Answer } from '../classes/Answer';
import { Agent } from '../classes/Agent';
import { Message } from '../classes/Message';
import { Question } from '../classes/Question';
import type { ChatRecord, CreateMessageRecordInput, DbService, MessageRecord } from './db.service';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  function createChatRecord(): ChatRecord {
    const now = new Date().toISOString();
    return {
      id: 1,
      name: 'Test Chat',
      status: 'Online',
      avatar: 'TC',
      createdAt: now,
      updatedAt: now,
    };
  }

  function createMessageRecord(
    overrides: Partial<MessageRecord> & Pick<MessageRecord, 'id' | 'chatId' | 'value'>,
  ): MessageRecord {
    return {
      from: 'supporter',
      messageType: 'message',
      tag: 'general',
      time: new Date().toISOString(),
      isRead: true,
      ...overrides,
    };
  }

  function createDbMock() {
    return {
      createChat: vi.fn(),
      getChats: vi.fn(),
      deleteChat: vi.fn(),
      getChatMessages: vi.fn(),
      createMessage: vi.fn(async (message: CreateMessageRecordInput) => ({
        id: 1,
        chatId: message.chatId,
        from: message.from,
        messageType: message.messageType,
        value: message.value,
        tag: message.tag,
        time: message.time,
        isRead: message.isRead,
        possibleAnswers: message.possibleAnswers,
        validatorSpec: message.validatorSpec,
        validationErrorMessage: message.validationErrorMessage,
      })),
      markChatRead: vi.fn(),
      updateChatTitle: vi.fn(),
    } as unknown as DbService & {
      createMessage: ReturnType<typeof vi.fn>;
    };
  }

  async function flushPersistedMessage(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('hydrates explicit message types, including validator-only questions and answers', () => {
    const service = new ChatService(createDbMock());
    const chat = service.hydrateChat(createChatRecord(), new Agent(), [
      createMessageRecord({
        id: 1,
        chatId: 1,
        messageType: 'question',
        value: 'Enter a 4 digit code',
        validatorSpec: {
          type: 'and',
          rules: [
            { type: 'required' },
            { type: 'regex', pattern: '^\\d+$' },
            { type: 'length', min: 4, max: 4 },
          ],
        },
        validationErrorMessage: 'Digits only',
      }),
      createMessageRecord({
        id: 2,
        chatId: 1,
        from: 'client',
        messageType: 'answer',
        value: '1234',
      }),
      createMessageRecord({
        id: 3,
        chatId: 1,
        messageType: 'message',
        value: 'Thanks',
      }),
    ]);

    expect(chat.messages[0]).toBeInstanceOf(Question);
    expect(chat.messages[1]).toBeInstanceOf(Answer);
    expect(chat.messages[2]).toBeInstanceOf(Message);

    const hydratedQuestion = chat.messages[0] as Question;
    expect(hydratedQuestion.possibleAnswers).toEqual([]);
    expect(hydratedQuestion.isAnswerValid(new Answer('9999'))).toBe(true);
    expect(hydratedQuestion.isAnswerValid(new Answer('99a9'))).toBe(false);
  });

  it('restores the last supporter question so validation still works after reload', async () => {
    const service = new ChatService(createDbMock());
    const chat = service.hydrateChat(createChatRecord(), new Agent(), [
      createMessageRecord({
        id: 1,
        chatId: 1,
        messageType: 'question',
        value: 'Enter 4 digits',
        validatorSpec: {
          type: 'and',
          rules: [
            { type: 'regex', pattern: '^\\d+$' },
            { type: 'length', min: 4, max: 4 },
          ],
        },
        validationErrorMessage: 'Digits only',
      }),
    ]);

    const invalidAnswer = new Answer('12ab');
    invalidAnswer.from = 'client';
    invalidAnswer.isRead = true;
    chat.messages.push(invalidAnswer);

    await expect(chat.supporter.respond()).rejects.toThrow('validation didnt pass');
    expect(chat.messages.at(-1)?.value).toBe('Digits only');
  });

  it('persists question validator metadata and string-compatible validation errors', async () => {
    const db = createDbMock();
    const service = new ChatService(db);
    const chat = service.hydrateChat(createChatRecord(), new Agent(), []);
    const question = new Question('Enter digits');
    question.setValidator({ type: 'regex', pattern: '^\\d+$' }, new Message('Digits only'));

    chat.supporter.ask(question);
    await flushPersistedMessage();

    expect(db.createMessage).toHaveBeenCalledTimes(1);
    expect(db.createMessage.mock.calls[0]?.[0]).toMatchObject({
      messageType: 'question',
      validatorSpec: { type: 'regex', pattern: '^\\d+$' },
      validationErrorMessage: 'Digits only',
    });
  });

  it('falls back to the default validation message when a runtime-only Message cannot be persisted', async () => {
    const db = createDbMock();
    const service = new ChatService(db);
    const chat = service.hydrateChat(createChatRecord(), new Agent(), []);
    const question = new Question('Upload a file');
    question.setValidator({ type: 'required' }, new Message(new File(['proof'], 'proof.txt')));

    chat.supporter.ask(question);
    await flushPersistedMessage();

    expect(db.createMessage.mock.calls[0]?.[0]?.validationErrorMessage).toBeUndefined();
  });

  it('ignores malformed persisted validator specs without crashing hydration', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const service = new ChatService(createDbMock());
    const chat = service.hydrateChat(createChatRecord(), new Agent(), [
      createMessageRecord({
        id: 1,
        chatId: 1,
        messageType: 'question',
        value: 'Anything goes now',
        validatorSpec: { type: 'definitely-not-valid' } as unknown as MessageRecord['validatorSpec'],
      }),
    ]);

    const hydratedQuestion = chat.messages[0] as Question;
    expect(hydratedQuestion.isAnswerValid(new Answer('anything'))).toBe(true);
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
