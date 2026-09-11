import { signal } from '@angular/core';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { MessageCollection } from '../../classes/MessageCollection';
import { Proposal } from '../../classes/Proposal';
import { Supporter } from '../../classes/Supporter';
import { createChatManagerStub } from '../../testing/chat-manager.stub';
import { UserBatchNegotiator } from './UserBatchNegotiator';

function setup() {
  const chat = new Chat(crypto.randomUUID(), 'Test', new Supporter(crypto.randomUUID()), createChatManagerStub());
  const messages = [new Message('First', { from: 'client' }), new Message('Second', { from: 'client' })];
  messages.forEach((message) => message.setChat(chat));
  chat.messages.set(messages);
  const selection = new MessageCollection(chat);
  messages.forEach((message) => selection.addMessage(message));
  const activeProposal = signal<Proposal | undefined>(undefined);
  const confirmProposal = vi.fn<(message: string) => boolean>();
  const negotiator = new UserBatchNegotiator(selection, activeProposal, confirmProposal);
  return { chat, messages, selection, activeProposal, confirmProposal, negotiator };
}

// requestAnimationFrame isn't driven by anything in this environment; resolve it
// synchronously so we can assert on the proposal being visible *before* it fires.
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('UserBatchNegotiator', () => {
  it('shows the proposal before asking for confirmation, then hides it on approval', async () => {
    const { messages, activeProposal, confirmProposal, negotiator } = setup();
    const proposal = new Proposal(new Set(messages), 'delete');
    let proposalWasVisibleDuringConfirm = false;
    confirmProposal.mockImplementation(() => {
      proposalWasVisibleDuringConfirm = activeProposal() === proposal;
      return true;
    });

    const answer = await negotiator.negotiateBatchDelete(proposal);

    expect(proposalWasVisibleDuringConfirm).toBe(true);
    expect(answer).toBe(true);
    expect(activeProposal()).toBeUndefined();
  });

  it('clears the selection and hides the proposal when the user declines', async () => {
    const { selection, activeProposal, confirmProposal, negotiator, messages } = setup();
    confirmProposal.mockReturnValue(false);
    const proposal = new Proposal(new Set(messages), 'edit');

    const answer = await negotiator.negotiateBatchEdit(proposal);

    expect(answer).toBe(false);
    expect(selection.messages().size).toBe(0);
    expect(activeProposal()).toBeUndefined();
  });

  it('still hides the proposal if confirmation throws', async () => {
    const { activeProposal, confirmProposal, negotiator, messages } = setup();
    confirmProposal.mockImplementation(() => {
      throw new Error('dialog unavailable');
    });
    const proposal = new Proposal(new Set(messages), 'delete');

    await expect(negotiator.negotiateBatchDelete(proposal)).rejects.toThrow('dialog unavailable');
    expect(activeProposal()).toBeUndefined();
  });
});
