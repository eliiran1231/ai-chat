import { ClientNegotiator } from './ClientNegotiator';
import { OperationsNegotiationMediator } from './OperationsNegotiationMediator';
import { DeleteProposal, EditProposal } from './Proposals';
import { Message } from './Message';
import type { OperationsNegotiator } from '../interfaces/OperationsNegotiator';

describe('OperationsNegotiationMediator', () => {
  const language = { translate: (key: string) => key };

  for (const kind of ['edit', 'delete'] as const) {
    const method = kind === 'edit' ? 'negotiateBatchEdit' : 'negotiateBatchDelete';
    const proposal = () => {
      const message = new Message('Original');
      return kind === 'edit'
        ? new EditProposal(new Set([{ oldMessage: message, newMessage: message.clone() }]))
        : new DeleteProposal(new Set([message]));
    };

    it(`passes the current ${kind} proposer through counterproposals and final confirmation`, async () => {
      const alerts = { confirm: vi.fn().mockResolvedValue(true) };
      const client = new ClientNegotiator(alerts, language);
      const finalDecision = vi.spyOn(client, method);
      const initial = proposal();
      const revised = proposal();
      const giver: OperationsNegotiator = {
        negotiateBatchEdit: vi.fn().mockResolvedValue(true),
        negotiateBatchDelete: vi.fn().mockResolvedValue(true),
      };
      const receiver: OperationsNegotiator = {
        negotiateBatchEdit: vi.fn().mockResolvedValue(revised),
        negotiateBatchDelete: vi.fn().mockResolvedValue(revised),
      };

      await expect(new OperationsNegotiationMediator(client).negotiate(initial, giver, receiver))
        .resolves.toBe(revised);

      expect(receiver[method]).toHaveBeenCalledWith(initial, giver);
      expect(giver[method]).toHaveBeenCalledWith(revised, receiver);
      expect(finalDecision).toHaveBeenCalledWith(revised, receiver);
      expect(alerts.confirm).toHaveBeenCalledTimes(1);
    });

    it(`stops a rejected ${kind} before client confirmation`, async () => {
      const alerts = { confirm: vi.fn() };
      const client = new ClientNegotiator(alerts, language);
      const receiver = { negotiateBatchEdit: () => false, negotiateBatchDelete: () => false };

      await expect(new OperationsNegotiationMediator(client).negotiate(proposal(), client, receiver))
        .resolves.toBeNull();
      expect(alerts.confirm).not.toHaveBeenCalled();
    });
  }

  it('requires confirmation when a manager revises a user-originated edit', async () => {
    const alerts = { confirm: vi.fn().mockResolvedValue(false) };
    const client = new ClientNegotiator(alerts, language);
    const original = new Message('Original');
    const initial = new EditProposal(new Set([{ oldMessage: original, newMessage: original.clone() }]));
    const revised = new EditProposal(new Set([{ oldMessage: original, newMessage: new Message('Revised') }]));
    const manager = { negotiateBatchEdit: () => revised, negotiateBatchDelete: () => false };

    await expect(new OperationsNegotiationMediator(client).negotiate(initial, client, manager))
      .resolves.toBeNull();
    expect(alerts.confirm).toHaveBeenCalledTimes(1);
    expect(client.activeProposal()).toBeUndefined();
  });
});
