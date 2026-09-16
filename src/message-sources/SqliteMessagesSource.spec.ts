import { Injector, signal } from '@angular/core';
import { Agent } from '../classes/Agent';
import { Chat } from '../classes/Chat';
import { Message } from '../classes/Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { AgentsService } from '../services/agents.service';
import { DbService } from '../services/db.service';
import { SqliteMessagesSource } from './SqliteMessagesSource';

describe('SqliteMessagesSource sender hydration', () => {
  it('resolves registered names without constructing agents and preserves legacy senders', async () => {
    class SenderAgent extends Agent {
      constructor(injector: Injector) {
        super(injector);
        throw new Error('Hydration must not construct the sending agent');
      }
    }
    const agents = new AgentsService(Injector.create({ providers: [] }), { stableName: SenderAgent });
    const chat = { id: () => 'chat', messages: signal<Message[]>([]) } as unknown as Chat;
    const records = [
      { type: 'supporter', agentName: 'stableName' },
      { type: 'client' },
      { type: 'supporter' },
    ].map((from, index) => ({
      id: String(index), chatId: 'chat', from, value: 'hello',
      time: '2026-01-01T00:00:00.000Z', status: MessageStatus.Sent,
      editable: true, deletable: true,
    }));
    const db = { getChatMessages: async () => records } as unknown as DbService;
    const source = new SqliteMessagesSource(chat, db, async () => true, agents);

    const messages = await source.loadChunk();

    expect(messages[0].from()).toEqual({ type: 'supporter', senderClass: SenderAgent });
    expect(agents.getAgentClassName(SenderAgent)).toBe('stableName');
    expect(messages[1].from()).toEqual({ type: 'client' });
    expect(messages[2].from()).toEqual({ type: 'supporter', senderClass: undefined });
  });
});
