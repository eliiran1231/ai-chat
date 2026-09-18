import { Injector } from '@angular/core';
import { Chat } from './Chat';
import { ChatManager } from './ChatManager';
import { Message } from './Message';
import { MessageCollection } from './MessageCollection';
import { AcceptedEditCandidate } from './Proposals';
import { Supporter } from './Supporter';
import { MessageStatus } from '../enums/MessagesStatus';
import type { ChatProvider } from '../interfaces/ChatProvider';
import { ChatService } from '../services/chat.service';
import { AlertService } from '../services/alert.service';
import { LanguageService } from '../services/language.service';
import { defaultNegotiator } from './DefaultNegotiator';

class RecordingChatManager extends ChatManager {
  edited: AcceptedEditCandidate[] = [];
  deleted: Message[] = [];
  editStatus = MessageStatus.Sent;
  deleteStatus = MessageStatus.Sent;

  protected override onMessagesEditRequested(candidates: AcceptedEditCandidate[]): MessageStatus {
    this.edited = candidates;
    return this.editStatus;
  }

  protected override onMessagesDeleteRequested(messages: Message[]): MessageStatus {
    this.deleted = messages;
    return this.deleteStatus;
  }
}

function createChat() {
  const alerts = { confirm: vi.fn().mockResolvedValue(true) };
  const injector = Injector.create({
    providers: [
      { provide: ChatService, useValue: { removeChat: vi.fn() } },
      { provide: AlertService, useValue: alerts },
      { provide: LanguageService, useValue: { translate: (key: string) => key } },
    ],
  });
  const provider = {} as ChatProvider;
  const manager = new RecordingChatManager(injector, provider);
  const chat = new Chat('chat-id', 'Chat', new Supporter('supporter-id'), manager);
  return { chat, manager, alerts };
}

describe('message batch operations', () => {
  it('creates independent empty collections with the participant negotiators', () => {
    const { chat } = createChat();
    const message = new Message('Existing');
    chat.messages.set([message]);
    const supporterBatch = chat.supporter.createMessageCollection();
    expect(supporterBatch.negotiator).toBe(defaultNegotiator);
    expect(supporterBatch.messages().size).toBe(0);

    const policy = { negotiateBatchEdit: () => false, negotiateBatchDelete: () => false };
    chat.supporter.negotiator = policy;
    const customSupporterBatch = chat.supporter.createMessageCollection();
    expect(customSupporterBatch.negotiator).toBe(policy);
    expect(supporterBatch.negotiator).toBe(defaultNegotiator);

    const userBatch = chat.user.createMessageCollection();
    expect(userBatch.negotiator).toBe(chat.user.negotiator);
    expect(userBatch.messages().size).toBe(0);
    userBatch.addMessage(message);
    expect(chat.user.createMessageCollection().messages().size).toBe(0);
    expect(customSupporterBatch.messages().size).toBe(0);
  });

  it('persists a user collection edit without asking the user to confirm it again', async () => {
    const { chat, manager, alerts } = createChat();
    const message = new Message('Before', { from: { type: 'client' } });
    chat.messages.set([message]);
    const batch = chat.user.createMessageCollection();
    batch.addMessage(message);

    await expect(batch.edit(() => 'After')).resolves.toBe(MessageStatus.Sent);

    expect(alerts.confirm).not.toHaveBeenCalled();
    expect(manager.edited).toHaveLength(1);
    expect(message.value()).toBe('After');
  });

  it('still confirms user collection deletes and preserves the batch on cancellation', async () => {
    const { chat, manager, alerts } = createChat();
    alerts.confirm.mockResolvedValue(false);
    const message = new Message('Keep', { status: MessageStatus.Sent });
    chat.messages.set([message]);
    const batch = chat.user.createMessageCollection();
    batch.addMessage(message);

    await expect(batch.delete()).resolves.toBe(MessageStatus.Failed);

    expect(alerts.confirm).toHaveBeenCalledTimes(1);
    expect(manager.deleted).toEqual([]);
    expect(chat.messages()).toEqual([message]);
    expect(batch.messages()).toEqual(new Set([message]));
    expect(message.status()).toBe(MessageStatus.Sent);
  });

  it('confirms supporter edits before persisting them', async () => {
    const { chat, manager, alerts } = createChat();
    alerts.confirm.mockResolvedValue(false);
    const message = new Message('Before', { from: { type: 'client' } });
    chat.messages.set([message]);
    const batch = chat.supporter.createMessageCollection();
    batch.addMessage(message);

    await expect(batch.edit(() => 'After')).resolves.toBe(MessageStatus.Failed);

    expect(alerts.confirm).toHaveBeenCalledTimes(1);
    expect(manager.edited).toEqual([]);
    expect(message.value()).toBe('Before');
  });

  it('submits the requested single-message edit and reports success on the original', async () => {
    const { chat, manager } = createChat();
    const message = new Message('before', { from: { type: 'client' } });
    message.setChat(chat);
    chat.messages.set([message]);

    await expect(message.edit('after')).resolves.toBe(true);

    expect(manager.edited).toHaveLength(1);
    expect(manager.edited[0].newMessage.value()).toBe('after');
    expect(manager.edited[0].oldMessage).toBe(message);
    expect(message.value()).toBe('after');
    expect(message.status()).toBe(MessageStatus.Sent);
  });

  it('derives batch affordances from every selected message and submits edited clones together', async () => {
    const { chat, manager } = createChat();
    const client = new Message('one', { from: { type: 'client' } });
    const supporter = new Message('two', { from: { type: 'supporter' } });
    const locked = new Message('three', { from: { type: 'client' }, deletable: false });
    chat.messages.set([client, supporter, locked]);
    const selection = new MessageCollection(chat);

    selection.addMessage(client);
    selection.addMessage(supporter);
    expect(selection.canEdit()).toBe(false);
    expect(selection.canDelete()).toBe(true);

    selection.addMessage(locked);
    expect(selection.canDelete()).toBe(false);
    selection.removeMessage(locked);
    await expect(selection.edit((message, index) => `${message.value()}-${index}`)).resolves.toBe(MessageStatus.Sent);

    expect(manager.edited.map(({ newMessage }) => newMessage.value())).toEqual(['one-0', 'two-1']);
    expect(chat.messages().map((message) => message.value())).toEqual(['one-0', 'two-1', 'three']);
  });

  it('removes successful deletes from the chat and clears the selection', async () => {
    const { chat, manager } = createChat();
    const first = new Message('first', { from: { type: 'client' } });
    const second = new Message('second', { from: { type: 'client' } });
    chat.messages.set([first, second]);
    const selection = new MessageCollection(chat);
    selection.addMessage(first);
    selection.addMessage(second);

    await expect(selection.delete()).resolves.toBe(MessageStatus.Sent);

    expect(manager.deleted).toEqual([first, second]);
    expect(chat.messages()).toEqual([]);
    expect(selection.messages().size).toBe(0);
  });

  it('keeps the optimistic value and selection while marking a failed batch edit', async () => {
    const { chat, manager } = createChat();
    manager.editStatus = MessageStatus.Failed;
    const message = new Message('original', { from: { type: 'client' } });
    chat.messages.set([message]);
    const selection = new MessageCollection(chat);
    selection.addMessage(message);

    await expect(selection.edit(() => 'not persisted')).resolves.toBe(MessageStatus.Failed);

    expect(manager.edited[0].newMessage.value()).toBe('not persisted');
    expect(message.value()).toBe('not persisted');
    expect(message.status()).toBe(MessageStatus.Failed);
    expect(selection.messages()).toEqual(new Set([message]));
  });
});
