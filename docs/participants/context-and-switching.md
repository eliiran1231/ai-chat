# Supporter context

Supporter context stores agent or workflow state that must survive persistence and agent reconstruction. It is separate from synced properties because it is replaced and saved as one value.

Read the current value through:

```ts
const context = this.supporter.context;
```

Replace and persist it with:

```ts
await this.supporter.setContext({
  step: 'confirm-details',
  collectedName: 'Alex',
});
```

`setContext(...)` updates the context, invokes the supporter's entity save handler, and emits `onContextChange` after the save resolves.

Use JSON-serializable values. `SqliteProvider` serializes supporter context when it is committed and parses it while hydrating the chat. Invalid persisted JSON falls back to an empty object.

# What belongs in context?

Persist state that is necessary to resume the conversation:

- workflow step or state-machine snapshot;
- collected values not already represented by messages;
- backend identifiers needed by later flow steps.

Do not persist reconstructable UI or runtime state:

- open dialogs or selected menu items;
- loading indicators;
- active stream chunks;
- cancellable operation handles;
- cached display-only actions.

# Switching agents

Switch through the supporter:

```ts
await chat.supporter.setAgent(new SomeAgent(this.injector));
```

The supporter performs the switch in this order:

1. waits for the current agent's `onDestroy()`;
2. assigns the new agent;
3. waits for `newAgent.init(chat, supporter, isNewChat)`;
4. emits `onAgentSwitch`.

Providers can subscribe to `onAgentSwitch` to persist the registered agent name. This is how a restored chat can reconstruct the same agent later.

Agent names are registration keys, so changing a key can make persisted chats impossible to restore unless a migration or alias is provided.

# New and restored chats

The third `setAgent` argument declares creation intent:

```ts
await supporter.setAgent(initialAgent, true);  // newly created chat
await supporter.setAgent(initialAgent, false); // restored chat
```

Providers must pass this explicitly. Do not derive it from the current number of messages because lazy history may not have finished loading.

Agents should use `isNewChat` for one-time greetings or setup:

```ts
override async init(
  chat: Chat,
  supporter: Supporter,
  isNewChat = false,
): Promise<void> {
  await super.init(chat, supporter, isNewChat);
  if (isNewChat) await supporter.sendMessage('Welcome!');
}
```

# Cleaning up agents

An agent that owns subscriptions, timers, streams, or actors must release them in `onDestroy()` and then call the base method:

```ts
override async onDestroy(): Promise<void> {
  this.actor?.stop();
  await super.onDestroy();
}
```

The base implementation removes the answer-selection, edit, and delete subscriptions installed during initialization.
