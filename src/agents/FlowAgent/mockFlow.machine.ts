import { createMachine, assign } from 'xstate';

export const flowQuestionTags = {
  name: 'flow:name',
  age: 'flow:age',
} as const;

export interface FlowAnswer<T> {
  value?: T;
  messageId?: string;
  questionId?: string;
}

export interface FlowContext {
  name: FlowAnswer<string>;
  age: FlowAnswer<number>;
}

type FlowEvent =
  | { type: 'ANSWER' | 'QUESTION' | 'MESSAGE'; id: string; tag: string; value: string }
  | { type: 'DELETE'; tags: string[] };

// Older persisted snapshots used separate value, answer ID and question ID fields.
export function restoreFlowContext(context: {
  name?: string | FlowAnswer<string>;
  age?: number | FlowAnswer<number>;
  nameMessageId?: string;
  ageMessageId?: string;
  nameQuestionId?: string;
  ageQuestionId?: string;
}): FlowContext {
  const name = typeof context.name === 'object' && context.name !== null
    ? context.name
    : { value: context.name, messageId: context.nameMessageId, questionId: context.nameQuestionId };
  const age = typeof context.age === 'object' && context.age !== null
    ? context.age
    : { value: context.age, messageId: context.ageMessageId, questionId: context.ageQuestionId };
  return {
    name,
    age,
  };
}

export const mockFlowMachine = createMachine({
  types: {} as { context: FlowContext; events: FlowEvent },
  context: () => ({ name: {}, age: {} }),
  id: 'mockFlow',
  initial: 'askName',
  on: {
    QUESTION: {
      actions: assign(({ context, event }) => {
        const checkpoint = event.tag === flowQuestionTags.name ? 'name' :
          event.tag === flowQuestionTags.age ? 'age' : undefined;
        return {
          ...(checkpoint ? { [checkpoint]: { ...context[checkpoint], questionId: event.id } } : {}),
        };
      }),
    },
    DELETE: [
      {
        guard: ({ event }) => event.tags.includes(flowQuestionTags.name),
        target: '#mockFlow.askName',
        reenter: true,
        actions: assign({
          name: () => ({}),
          age: () => ({}),
        }),
      },
      {
        guard: ({ event }) => event.tags.includes(flowQuestionTags.age),
        target: '#mockFlow.askAge',
        reenter: true,
        actions: assign({
          age: () => ({}),
        }),
      },
    ],
  },
  states: {
    askName: {
      entry: 'askName',
      on: {
        ANSWER: [
          { target: 'invalidName', guard: 'isInvalidAnswer' },
          {
            target: 'askAge',
            actions: assign({
              name: ({ context, event }) => ({ ...context.name, value: event.value, messageId: event.id }),
            }),
          },
        ],
      },
    },
    askAge: {
      entry: 'askAge',
      on: {
        ANSWER: [
          { target: 'invalidAge', guard: 'isInvalidAnswer' },
          {
            target: 'done',
            actions: assign({
              age: ({ context, event }) => ({ ...context.age, value: Number(event.value), messageId: event.id }),
            }),
          },
        ],
      },
    },
    invalidName: { entry: 'sendInvalidName', always: 'askName' },
    invalidAge: { entry: 'sendInvalidAge', always: 'askAge' },
    done: { entry: 'finish' },
  },
});
