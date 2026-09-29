import { Injector } from '@angular/core';
import { FlowAgent } from './FlowAgent';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { Question } from '../../classes/Question';
import { defaultNegotiator } from '../../classes/DefaultNegotiator';
import { XStateManager } from '../../chat-managers/XStateManager';
import type { SqliteProvider } from '../../chat-providers/SqliteProvider';
import { AgentsService } from '../../services/agents.service';
import { ChatService } from '../../services/chat.service';
import { DbService } from '../../services/db.service';
import { AlertService } from '../../services/alert.service';
import { LanguageService } from '../../services/language.service';

async function createFlow() {
  const injector = Injector.create({
    providers: [
      { provide: AgentsService, useValue: { getAgentName: () => 'FlowAgent' } },
      { provide: ChatService, useValue: {} },
      { provide: DbService, useValue: {} },
      { provide: AlertService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
      { provide: LanguageService, useValue: { translate: (key: string) => key } },
    ],
  });
  const provider = {
    addMessage: vi.fn().mockResolvedValue(undefined),
    deleteBatch: vi.fn(async (ids: string[]) => ids),
  };
  const manager = new XStateManager(injector, provider as unknown as SqliteProvider);
  const chat = new Chat('chat', 'Flow', new Supporter('supporter'), manager);
  const agent = new FlowAgent(injector);
  await chat.supporter.setAgent(agent);
  const nameQuestion = chat.messages().at(-1)!;
  const nameAnswer = new Answer('Kyle');
  await chat.user.answer(nameAnswer);
  const ageQuestion = chat.messages().at(-1)!;
  const ageAnswer = new Answer('22');
  await chat.user.answer(ageAnswer);
  return { chat, agent, injector, provider, nameQuestion, nameAnswer, ageQuestion, ageAnswer };
}

describe('FlowAgent deletion checkpoints', () => {
  it('records prompts and groups answer values and IDs, then repeats age after deletion', async () => {
    const { chat, agent, provider, ageAnswer, ageQuestion } = await createFlow();
    expect(agent.actor.getSnapshot().context.age).toEqual({
      value: 22, messageId: ageAnswer.id(), questionId: ageQuestion.id(),
    });
    expect(agent.actor.getSnapshot().context).not.toHaveProperty('messages');
    expect(ageAnswer.tag()).toBe(ageQuestion.tag());
    expect(provider.addMessage).toHaveBeenCalledWith(chat.id(), ageAnswer);

    await ageAnswer.delete({ negotiator: defaultNegotiator });

    expect(agent.actor.getSnapshot().value).toBe('askAge');
    expect(agent.actor.getSnapshot().context.age.value).toBeUndefined();
    expect(agent.actor.getSnapshot().context.name.value).toBe('Kyle');
    expect(chat.messages()).not.toContain(ageAnswer);
    expect(chat.messages().at(-1)?.tag()).toBe('flow:age');
    expect(agent.lastQuestion).toBe(chat.messages().at(-1));
    await chat.user.answer('24');
    expect(agent.actor.getSnapshot().value).toBe('done');
    expect(chat.messages().at(-1)?.value()).toBe('Nice to meet you Kyle, age 24');
  });

  it('restarts at name and invalidates age when the earlier answer is deleted', async () => {
    const { chat, agent, nameAnswer } = await createFlow();
    await nameAnswer.delete({ negotiator: defaultNegotiator });
    const snapshot = agent.actor.getSnapshot();
    expect(snapshot.value).toBe('askName');
    expect(snapshot.context.name.value).toBeUndefined();
    expect(snapshot.context.age.value).toBeUndefined();
    expect(snapshot.context.age.messageId).toBeUndefined();
    expect(snapshot.context).not.toHaveProperty('messages');
    await chat.user.answer('Brad');
    await chat.user.answer('30');
    expect(chat.messages().at(-1)?.value()).toBe('Nice to meet you Brad, age 30');
  });

  it('repeats the current prompt when that prompt itself is deleted', async () => {
    const { chat, agent, ageAnswer } = await createFlow();
    await ageAnswer.delete({ negotiator: defaultNegotiator });
    const prompt = chat.messages().at(-1)!;
    await prompt.delete({ negotiator: defaultNegotiator });
    expect(agent.actor.getSnapshot().value).toBe('askAge');
    expect(chat.messages().at(-1)).toBeInstanceOf(Question);
    expect(chat.messages().at(-1)?.id()).not.toBe(prompt.id());
    expect(agent.actor.getSnapshot().context.age.questionId).toBe(chat.messages().at(-1)?.id());
  });

  it('chooses the earliest checkpoint when a batch deletes both answers', async () => {
    const { chat, agent, nameAnswer, ageAnswer } = await createFlow();
    const batch = chat.supporter.createMessageCollection();
    batch.addMessage(ageAnswer);
    batch.addMessage(nameAnswer);
    await batch.delete();
    expect(agent.actor.getSnapshot().value).toBe('askName');
  });

  it('leaves the flow untouched when persistence rejects the deletion', async () => {
    const { chat, agent, provider, ageAnswer } = await createFlow();
    provider.deleteBatch.mockResolvedValueOnce([]);
    const before = agent.actor.getSnapshot();
    const messages = [...chat.messages()];
    await expect(ageAnswer.delete({ negotiator: defaultNegotiator })).resolves.toBe(false);
    expect(agent.actor.getSnapshot()).toBe(before);
    expect(chat.messages()).toEqual(messages);
  });

  it('migrates an older saved snapshot and can rewind it after reload', async () => {
    const { chat, agent, injector, nameAnswer, ageAnswer } = await createFlow();
    const saved = agent.actor.getPersistedSnapshot();
    await chat.supporter.setContext({
      ...saved,
      context: {
        name: 'Kyle', nameMessageId: nameAnswer.id(),
        age: 22, ageMessageId: ageAnswer.id(),
        messages: [{ id: ageAnswer.id(), value: '22', type: 'ANSWER', tag: 'general' }],
      },
    });
    const restored = new FlowAgent(injector);
    await chat.supporter.setAgent(restored);
    expect(restored.actor.getSnapshot().context.age.value).toBe(22);
    expect(restored.actor.getSnapshot().context).not.toHaveProperty('ageMessageId');
    expect(restored.actor.getSnapshot().context).not.toHaveProperty('messages');
    ageAnswer.tag.set('general');
    await ageAnswer.delete({ negotiator: defaultNegotiator });
    expect(restored.actor.getSnapshot().value).toBe('askAge');
    await chat.user.answer('23');
    expect(chat.messages().at(-1)?.value()).toBe('Nice to meet you Kyle, age 23');
  });

  it('can rewind directly by tag without looking up any message IDs', async () => {
    const { chat, agent } = await createFlow();
    agent.actor.send({ type: 'DELETE', tags: ['flow:age'] });
    expect(agent.actor.getSnapshot().value).toBe('askAge');
    expect(agent.actor.getSnapshot().context.name.value).toBe('Kyle');
    expect(chat.messages().at(-1)?.tag()).toBe('flow:age');
    agent.actor.send({ type: 'DELETE', tags: ['flow:name', 'flow:age'] });
    expect(agent.actor.getSnapshot().value).toBe('askName');
    expect(agent.actor.getSnapshot().context.age).toEqual({});
  });

  it('ignores unrelated tags', async () => {
    const { agent } = await createFlow();
    const before = agent.actor.getSnapshot();
    agent.actor.send({ type: 'DELETE', tags: ['general'] });
    expect(agent.actor.getSnapshot()).toBe(before);
  });
});
