# Overridable functions

Agents have lifecycle and event functions that can be overridden to declare custom behavior. Most overrides should call the base implementation so the shared chat behavior remains active.

## `init(chat, supporter, isNewChat)`

Called whenever a supporter is assigned this agent.

```ts
override async init(
  chat: Chat,
  supporter: Supporter,
  isNewChat = false,
): Promise<void> {
  await super.init(chat, supporter, isNewChat);

  if (isNewChat) {
    await this.supporter.sendMessage('Welcome!');
  }
}
```

The base implementation:

- assigns `chat` and `supporter`;
- restores `lastQuestion` from the chat history;
- subscribes to answer selections, message edits, and message deletions.

Always call `super.init(...)`. Use the explicit `isNewChat` flag for greeting logic; a restored chat can temporarily have no hydrated messages and should not be treated as new for that reason.

## `respond(edited)`

Called after a client sends a message, and called with `true` after the message history is rewound because a client message was edited.

```ts
override async respond(edited = false): Promise<void> {
  await super.respond(edited);

  if (!this.lastMessage) return;
  await this.supporter.sendMessage(`You said: ${this.lastMessage.value()}`);
}
```

The base implementation:

- sets `lastMessage` to the final chat message;
- rejects calls when there is no client message to answer;
- marks the client message as read;
- validates an `Answer` against `lastQuestion` and calls `onInvalidAnswer` when it fails.

Call `super.respond(...)` before reading `lastMessage`. If validation fails, the default invalid-answer handler throws, so statements after `super.respond(...)` do not run.

## `onInvalidAnswer(answer, lastQuestion)`

Called by `respond` when the latest `Answer` does not satisfy the question's validator.

```ts
override onInvalidAnswer(answer: Answer, lastQuestion: Question): void {
  this.supporter.sendMessage(
    `"${answer.value()}" is not valid for ${lastQuestion.value()}`,
  );
}
```

The default implementation sends `lastQuestion.validationErrorMessage` and throws an error to stop the current response. Override it when another system owns invalid-answer transitions, such as a state machine. Calling `super.onInvalidAnswer(...)` preserves the default message-and-throw behavior.

## `onAnswerSelected(answer, associatedQuestion, associatedQuestionIndex)`

Called when the client selects one or more of a question's possible answers.

The default implementation clones a single answer, or joins multiple answers with `, `, and then:

- submits it as a new client answer when the associated question is the latest message; or
- edits the first later client `Answer` when the client changes an answer to an older question.

Most agents do not need to override this function. If you do, call the base implementation unless you are replacing the answer-submission behavior completely.

## `onMessageEdited(message)`

Called after a message is edited. The default implementation deletes every later message, restores `lastQuestion` from the remaining history, and calls `respond(true)` so the conversation can be rebuilt from the edit point.

Override this only when the agent requires a different rewind policy. Call `super.onMessageEdited(message)` to keep the default delete-and-replay behavior.

## `onMessageDeleted(message)`

Called after a chat message is deleted. The base implementation intentionally does nothing:

```ts
override onMessageDeleted(message: Message): void {
  // Update agent-specific state when a relevant message is removed.
}
```

This is the appropriate hook for cleaning up flow-specific state after a deletion.

## `onDestroy()`

Called before the supporter switches to another agent. The base implementation unsubscribes from every chat event installed by `init`.

```ts
override async onDestroy(): Promise<void> {
  this.actor?.stop();
  await super.onDestroy();
}
```

Always call `super.onDestroy()` when overriding it, and release any additional timers, subscriptions, streams, or state-machine actors owned by the subclass.

## Sync and async overrides

The lifecycle supports both synchronous and asynchronous implementations. `init`, `respond`, and `onDestroy` may return either `void` or `Promise<void>`. Prefer `async` when awaiting supporter operations or external services, and make sure every asynchronous failure is handled by the caller or the agent's flow.
