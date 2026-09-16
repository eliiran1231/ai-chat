import { ClientNegotiator } from './ClientNegotiator';
import { DeleteProposal, EditProposal } from './Proposals';
import { Message } from './Message';

describe('ClientNegotiator', () => {
  const language = { translate: vi.fn((key: string) => `translated:${key}`) };

  it('uses the alert for a single message and clears its proposal after confirmation', async () => {
    const alerts = { confirm: vi.fn().mockResolvedValue(true) };
    const negotiator = new ClientNegotiator(alerts, language);
    const proposal = new DeleteProposal(new Set([new Message('Only')]));

    await expect(negotiator.negotiateBatchDelete(proposal)).resolves.toBe(true);

    expect(alerts.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'translated:chat.confirmDeletionTitle',
      message: 'translated:chat.confirmDeletion',
    }));
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('uses AlertService while keeping the proposal visible until confirmation resolves', async () => {
    const messages = [new Message('First'), new Message('Second')];
    let resolveConfirmation!: (answer: boolean) => void;
    const alerts = {
      confirm: vi.fn(() => new Promise<boolean>((resolve) => { resolveConfirmation = resolve; })),
    };
    const negotiator = new ClientNegotiator(alerts, language);
    const proposal = new DeleteProposal(new Set(messages));

    const answer = negotiator.negotiateBatchDelete(proposal);

    expect(negotiator.activeProposal()).toBe(proposal);
    expect(alerts.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'translated:chat.confirmDeletionTitle',
      message: 'translated:chat.confirmDeletion',
    }));
    resolveConfirmation(true);
    await expect(answer).resolves.toBe(true);
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('reports a declined alert and clears the edit proposal', async () => {
    const alerts = { confirm: vi.fn().mockResolvedValue(false) };
    const negotiator = new ClientNegotiator(alerts, language);
    const messages = [new Message('First'), new Message('Second')];
    const proposal = new EditProposal(new Set(messages.map((newMessage) => ({
      newMessage,
      oldMessage: newMessage.clone(),
    }))));

    await expect(negotiator.negotiateBatchEdit(proposal)).resolves.toBe(false);
    expect(alerts.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'translated:chat.confirmEditsTitle' }));
    expect(negotiator.activeProposal()).toBeUndefined();
  });

  it('clears the proposal if the alert service rejects', async () => {
    const alerts = { confirm: vi.fn().mockRejectedValue(new Error('dialog unavailable')) };
    const negotiator = new ClientNegotiator(alerts, language);
    const proposal = new DeleteProposal(new Set([new Message('First'), new Message('Second')]));

    await expect(negotiator.negotiateBatchDelete(proposal)).rejects.toThrow('dialog unavailable');
    expect(negotiator.activeProposal()).toBeUndefined();
  });
});
