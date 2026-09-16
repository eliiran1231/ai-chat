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

function createChat(): { chat: Chat; manager: RecordingChatManager } {
  const injector = Injector.create({
    providers: [{ provide: ChatService, useValue: { removeChat: vi.fn() } }],
  });
  const provider = {} as ChatProvider;
  const manager = new RecordingChatManager(injector, provider);
  const chat = new Chat('chat-id', 'Chat', new Supporter('supporter-id'), manager);
  return { chat, manager };
}

describe('message batch operations', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits the requested single-message edit and updates the original only after it succeeds', async () => {
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
