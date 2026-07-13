# State-machine agents

State machines are useful when a conversation has explicit steps, branching, guards, and resumable state. The built-in `FlowAgent` demonstrates integrating XState with the base `Agent` lifecycle.

# Conversation events

`Agent.respond()` determines the latest client message. A state-machine agent can translate the message into an event:

```ts
override async respond(edited = false): Promise<void> {
  await super.respond(edited);
  if (!this.lastMessage) return;

  this.actor.send({
    type: this.lastMessage instanceof Question ? 'QUESTION' : 'ANSWER',
    value: this.lastMessage.value(),
  });
}
```

Define an event union that represents every input the machine accepts. Keep the translation at the agent boundary so the machine does not depend on Angular components.

# Defining a machine

```ts
export const intakeMachine = createMachine({
  types: {} as {
    context: {
      name?: string;
    };
    events: {
      type: 'ANSWER';
      value: string;
    };
  },
  id: 'intake',
  initial: 'askName',
  states: {
    askName: {
      entry: 'askName',
      on: {
        ANSWER: {
          target: 'done',
          actions: assign({ name: ({ event }) => event.value }),
        },
      },
    },
    done: {
      entry: 'finish',
    },
  },
});
```

Machine actions call supporter APIs through methods owned by the agent.

# Connecting actions and guards

Prefer an explicit catalog so only intended methods are exposed to XState:

```ts
private buildImplementations() {
  return {
    actions: {
      askName: () => this.askName(),
      finish: ({ context }: { context: { name?: string } }) =>
        this.finish(context),
    },
    guards: {
      isInvalidAnswer: () => this.isInvalidAnswer(),
    },
  };
}
```

The current `FlowAgent.buildActions()` example discovers every public prototype method and supplies the same map as both actions and guards. That is compact for a demonstration, but explicit catalogs are easier to type, audit, and maintain in production.

# Initializing the actor

Initialize the base agent first, create the actor, persist snapshots, and then start it:

```ts
override async init(
  chat: Chat,
  supporter: Supporter,
  isNewChat = false,
): Promise<void> {
  await super.init(chat, supporter, isNewChat);

  const machine = intakeMachine.provide(this.buildImplementations());
  this.actor = createActor(machine, {
    snapshot: isPersistedSnapshot(supporter.context)
      ? supporter.context
      : undefined,
  });

  this.actor.subscribe(snapshot => {
    void supporter.setContext(snapshot.toJSON());
  });

  this.actor.start();
}
```

Validate persisted context before passing it to XState. Context may be absent, malformed, or written by an older machine version.

# Persisting machine state

Store the actor snapshot through `supporter.setContext(...)`. The provider persists supporter context independently of message history, allowing a restored agent to resume the machine.

Machine schema changes require migration planning. Persist a version alongside the snapshot when the state structure is expected to evolve:

```ts
await supporter.setContext({
  version: 2,
  snapshot: actorSnapshot.toJSON(),
});
```

# Validation

The base `Agent.respond()` calls `onInvalidAnswer(...)` before the machine sees invalid input. The default handler sends the question's validation message and throws.

If the state machine owns invalid transitions, override the handler without calling `super`:

```ts
override onInvalidAnswer(_answer: Answer, _question: Question): void {
  // The XState guard selects the invalid transition.
}
```

Then use `lastQuestion.isAnswerValid(lastMessage)` from a guard. Make sure the machine always handles both valid and invalid paths.

# Switching agents

A terminal state can switch to another registered agent:

```ts
async finish(context: { name?: string }): Promise<void> {
  await this.supporter.sendMessage(`Nice to meet you, ${context.name}.`);
  await this.supporter.setAgent(
    this.agents.getAgentByName('MockAgent'),
  );
}
```

Resolve agents through `AgentsService` when possible so persisted names and registration remain consistent.

# Cleanup

Stop the actor before the base agent removes its subscriptions:

```ts
override async onDestroy(): Promise<void> {
  this.actor?.stop();
  await super.onDestroy();
}
```

Without cleanup, a replaced agent may continue reacting to actor events or persisting snapshots.

# Editing earlier answers

The base edit lifecycle deletes later messages and calls `respond(true)`. A state-machine flow may also need to restore or replay its machine snapshot to the edited point. Message history alone does not rewind the persisted actor automatically.

Choose and document one policy:

- rebuild the machine from remaining messages;
- persist a snapshot per significant step;
- disallow edits for answers that cannot be replayed safely.
