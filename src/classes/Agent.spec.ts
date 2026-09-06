import { Injector } from '@angular/core';
import { Agent } from './Agent';
import { Chat } from './Chat';
import { Message } from './Message';
import { MessageCollection } from './MessageCollection';
import { Question } from './Question';
import { Supporter } from './Supporter';
import { AgentsService } from '../services/agents.service';
import { MessageStatus } from '../enums/MessagesStatus';
import { createChatManagerStub } from '../testing/chat-manager.stub';

class BatchAgent extends Agent {
  readonly deleted = vi.fn();
  readonly edited = vi.fn();

  override onBatchDeleted(messages: readonly Message[]): void {
    super.onBatchDeleted(messages);
    this.deleted(messages, [...this.chat.messages()]);
  }

  override async onBatchEdited(messages: readonly Message[]): Promise<void> {
    this.edited(messages);
  }
}

function setup(messages = [new Message('First', { from: 'client' }), new Message('Second', { from: 'client' })]) {
  const manager = createChatManagerStub();
  const chat = new Chat(crypto.randomUUID(), 'Test', new Supporter(crypto.randomUUID()), manager);
  messages.forEach((message) => message.setChat(chat));
  chat.messages.set(messages);
  const injector = Injector.create({ providers: [{ provide: AgentsService, useValue: {} }] });
  const agent = new BatchAgent(injector);
  agent.init(chat, chat.supporter);
  const selection = new MessageCollection(chat);
  messages.forEach((message) => selection.addMessage(message));
  return { manager, chat, agent, selection, messages };
}

describe('Agent batch events', () => {
  it('calls the deletion override once after the batch is removed and refreshes the last question', async () => {
    const first = new Question('Earlier', { from: 'supporter' });
    const last = new Question('Latest', { from: 'supporter' });
    const { selection, agent } = setup([first, last]);
    const singleDeleted = vi.spyOn(agent, 'onMessageDeleted');
    selection.removeMessage(first);
    expect(agent.lastQuestion).toBe(last);
    await selection.delete();
    expect(agent.deleted).toHaveBeenCalledExactlyOnceWith([last], [first]);
    expect(agent.lastQuestion).toBe(first);
    expect(singleDeleted).not.toHaveBeenCalled();
  });

  it('calls the async edit override once with only successful edits', async () => {
    const { selection, manager, agent, messages } = setup();
    vi.spyOn(manager, 'requestMessageEdit').mockImplementation(async (message) =>
      message === messages[0] ? MessageStatus.Sent : MessageStatus.Failed);
    await selection.edit('Updated');
    expect(agent.edited).toHaveBeenCalledExactlyOnceWith([messages[0]]);
    expect(messages[0].value()).toBe('Updated');
  });

  it('does not emit for empty or entirely unsuccessful batches', async () => {
    const { selection, manager, agent } = setup();
    vi.spyOn(manager, 'requestMessageDelete').mockResolvedValue(MessageStatus.Failed);
    vi.spyOn(manager, 'requestMessageEdit').mockRejectedValue(new Error('Unavailable'));
    await selection.delete();
    await selection.edit('Updated');
    await manager.requestBatchDelete([]);
    await manager.requestBatchEdit([], 'Updated');
    expect(agent.deleted).not.toHaveBeenCalled();
    expect(agent.edited).not.toHaveBeenCalled();
  });

  it('unsubscribes both batch hooks on destruction', async () => {
    const { selection, agent } = setup();
    agent.onDestroy();
    await selection.edit('Updated');
    await selection.delete();
    expect(agent.deleted).not.toHaveBeenCalled();
    expect(agent.edited).not.toHaveBeenCalled();
  });

  it('keeps individual message events for individual actions', async () => {
    const { chat, agent, messages } = setup();
    const edited = vi.fn();
    const deleted = vi.fn();
    chat.onMessageEdited.subscribe(edited);
    chat.onMessageDeleted.subscribe(deleted);
    await messages[0].edit('Updated');
    await messages[0].delete();
    expect(edited).toHaveBeenCalledExactlyOnceWith(messages[0]);
    expect(deleted).toHaveBeenCalledExactlyOnceWith(messages[0]);
    expect(agent.edited).not.toHaveBeenCalled();
    expect(agent.deleted).not.toHaveBeenCalled();
  });
});
