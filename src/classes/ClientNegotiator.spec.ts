import { ClientNegotiator } from './ClientNegotiator';
import { DeleteProposal, EditProposal } from './Proposals';
import { Message } from './Message';

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

describe('ClientNegotiator', () => {
  it('approves a single message without ever prompting', async () => {
    const confirmProposal = vi.fn();
    const negotiator = new ClientNegotiator(confirmProposal);
    const proposal = new DeleteProposal(new Set([new Message('Only')]));

    const answer = await negotiator.negotiateBatchDelete(proposal);

    expect(answer).toBe(true);
    expect(confirmProposal).not.toHaveBeenCalled();
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('shows the proposal before asking for confirmation, then hides it on approval', async () => {
    const messages = [new Message('First'), new Message('Second')];
    let proposalWasVisibleDuringConfirm = false;
    const confirmProposal = vi.fn(() => {
      proposalWasVisibleDuringConfirm = negotiator.activeProposal() === proposal;
      return true;
    });
    const negotiator = new ClientNegotiator(confirmProposal);
    const proposal = new DeleteProposal(new Set(messages));

    const answer = await negotiator.negotiateBatchDelete(proposal);

    expect(proposalWasVisibleDuringConfirm).toBe(true);
    expect(answer).toBe(true);
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('reports the decline and still hides the proposal', async () => {
    const messages = [new Message('First'), new Message('Second')];
    const confirmProposal = vi.fn().mockReturnValue(false);
    const negotiator = new ClientNegotiator(confirmProposal);
    const proposal = new EditProposal(new Set(messages.map((newMessage) => ({ newMessage, oldMessage: newMessage.clone() }))));

    const answer = await negotiator.negotiateBatchEdit(proposal);

    expect(answer).toBe(false);
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('still hides the proposal if confirmation throws', async () => {
    const messages = [new Message('First'), new Message('Second')];
    const confirmProposal = vi.fn(() => {
      throw new Error('dialog unavailable');
    });
    const negotiator = new ClientNegotiator(confirmProposal);
    const proposal = new DeleteProposal(new Set(messages));

    await expect(negotiator.negotiateBatchDelete(proposal)).rejects.toThrow('dialog unavailable');
    expect(negotiator.activeProposal()).toBeUndefined();
  });
});
