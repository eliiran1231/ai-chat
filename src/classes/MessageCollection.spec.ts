import { Chat } from './Chat';
import { Message } from './Message';
import { MessageCollection } from './MessageCollection';
import { Supporter } from './Supporter';
import { MessageStatus } from '../enums/MessagesStatus';
import { createChatManagerStub } from '../testing/chat-manager.stub';

function createSelection() {
  const manager = createChatManagerStub();
  const chat = new Chat(crypto.randomUUID(), 'Test', new Supporter(crypto.randomUUID()), manager);
  const messages = [new Message('First', { from: 'client' }), new Message('Second', { from: 'client' })];
  messages.forEach((message) => message.setChat(chat));
  chat.messages.set(messages);
  const selection = new MessageCollection(chat);
  messages.forEach((message) => selection.addMessage(message));
  return { chat, manager, messages, selection };
}

describe('MessageCollection', () => {
  it('removes messages without mutating earlier selection snapshots and ignores other chats', () => {
    const { messages, selection, chat } = createSelection();
    const snapshot = selection.messages();
    selection.addMessage(messages[0]);
    selection.addMessage(new Message('Outside this chat'));
    expect(selection.size()).toBe(2);
    selection.removeMessage(messages[0]);
    expect(snapshot.size).toBe(2);
    expect(selection.singleMessage()).toBe(messages[1]);
    chat.messages.set([]);
    expect(selection.size()).toBe(0);
  });

  it('deletes successes, emits their events, and retains failed messages for another attempt', async () => {
    const { messages, selection, chat, manager } = createSelection();
    const deleted = vi.fn();
    chat.onBatchDeleted.subscribe(deleted);
    const singleDeleted = vi.fn();
    chat.onMessageDeleted.subscribe(singleDeleted);
    vi.spyOn(manager, 'requestMessageDelete').mockImplementation(async (message) =>
      message === messages[0] ? MessageStatus.Sent : MessageStatus.Failed);

    const results = await selection.delete();

    expect(results.get(messages[0])).toBe(true);
    expect(results.get(messages[1])).toBe(false);
    expect(chat.messages()).toEqual([messages[1]]);
    expect(selection.singleMessage()).toBe(messages[1]);
    expect(deleted).toHaveBeenCalledExactlyOnceWith([messages[0]]);
    expect(singleDeleted).not.toHaveBeenCalled();
    expect(selection.isBusy()).toBe(false);
  });

  it('isolates a thrown request and prevents duplicate deletion while pending', async () => {
    const { messages, selection, manager } = createSelection();
    let finish!: (status: MessageStatus) => void;
    const pending = new Promise<MessageStatus>((resolve) => { finish = resolve; });
    const request = vi.spyOn(manager, 'requestMessageDelete').mockImplementation((message) => {
      if (message === messages[0]) return pending;
      throw new Error('Provider unavailable');
    });
    const deletion = selection.delete();
    expect(selection.isBusy()).toBe(true);
    await selection.delete();
    expect(request).toHaveBeenCalledTimes(2);
    finish(MessageStatus.Sent);
    await deletion;
    expect(selection.singleMessage()).toBe(messages[1]);
    expect(selection.isBusy()).toBe(false);
  });

  it('does not delete a selection containing a protected message', async () => {
    const { messages, selection, manager } = createSelection();
    messages[1].deletable.set(false);
    const request = vi.spyOn(manager, 'requestMessageDelete');
    await selection.delete();
    expect(request).not.toHaveBeenCalled();
    expect(selection.size()).toBe(2);
  });

  it('edits the collection through each message lifecycle and respects edit permissions', async () => {
    const { messages, selection, chat, manager } = createSelection();
    const edited = vi.fn();
    chat.onBatchEdited.subscribe(edited);
    const singleEdited = vi.fn();
    chat.onMessageEdited.subscribe(singleEdited);
    const results = await selection.edit('Updated');
    expect([...results.values()]).toEqual([true, true]);
    expect(messages.map((message) => message.value())).toEqual(['Updated', 'Updated']);
    expect(edited).toHaveBeenCalledExactlyOnceWith(messages);
    expect(singleEdited).not.toHaveBeenCalled();
    messages[1].from.set('supporter');
    const request = vi.spyOn(manager, 'requestMessageEdit');
    await selection.edit('Forbidden');
    expect(request).not.toHaveBeenCalled();
  });
});
