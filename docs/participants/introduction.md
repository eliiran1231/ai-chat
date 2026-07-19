# Client and supporter participants

Every `Chat` owns two participant objects:

- `chat.user` is a `Client` representing the person using the UI;
- `chat.supporter` is a `Supporter` whose behavior is controlled by an `Agent`.

Participants are the supported way to append messages. They assign sender ownership, attach the chat, request persistence through the manager, and emit events after success.

## Client API

The client can ask questions and submit answers using the chat interface
if needed, the agent can also do it for him:

```ts
await chat.user.ask('Can you help me?');
await chat.user.ask(new Question('Can you help me?', options));

await chat.user.answer('Yes');
await chat.user.answer(new Answer('Yes', options));
```

Strings are converted to the matching concrete message type.

After a successful send, `Client` emits `onMessageAdded` and starts `chat.supporter.respond()`. The client send promise represents the message operation; the current implementation starts the agent response without waiting for the entire response flow to finish.

## Supporter API

The supporter exposes three message methods:

```ts
await chat.supporter.ask('What is your name?');
await chat.supporter.answer('Your request is approved.');
await chat.supporter.sendMessage('A normal informational message.');
```

Each method accepts either a string or the corresponding model object.

| Method | Message type | Updates `expects` to |
| --- | --- | --- |
| `ask(...)` | `Question` | `answer` |
| `answer(...)` | `Answer` | `question` |
| `sendMessage(...)` | `Message` | Unchanged |

When an agent is active, `ask(...)` also updates `agent.lastQuestion`.

### Unread behavior

After a successful supporter send:

- an inactive chat increments `unreadCount`;
- an active chat marks the message `Read`.

Calling `chat.markAsRead()` clears the unread count and marks every loaded supporter message read.

### Supporter events

The supporter publishes:

| Event | Payload |
| --- | --- |
| `onMessageAdded` | Successfully sent supporter message |
| `onAgentSwitch` | Newly initialized agent |
| `onContextChange` | Newly persisted context value |

## Expected input type

`supporter.expects` tells the UI which client message class to create next. The built-in chat component currently maps:

- `question` to `chat.user.ask(...)`;
- every other value to `chat.user.answer(...)`.

Agent authors should change this value through `supporter.ask(...)` or `supporter.answer(...)` unless they intentionally expect something other then the defaults (answer after question and vice versa)

## Failed sends

Participants append messages before the manager operation completes with a pending icon. If the manager returns `Failed`, the failed message remains in `chat.messages`, but with a failed icon, `onMessageAdded` is not emitted and the client does not trigger an agent response.

This allows the UI to show the failure and call `message.retry()`.

## Related guides

- [Messages](../messages/introduction.md)
- [Message lifecycle](../messages/lifecycle.md)
- [Supporter context and switching](context-and-switching.md)
- [Agent lifecycle functions](../agents/functions.md)
