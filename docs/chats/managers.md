# Chat managers

A `ChatManager` is the mutation boundary between chat-domain objects and a `ChatProvider`. Messages, chats, clients, and supporters request operations from the manager instead of calling storage APIs themselves.

The manager owns message delivery status, batch-operation negotiation, provider calls, and chat-level events. The base implementation accepts operations locally; persistent managers override protected hooks to call their provider.

## Built-in managers

| Manager | Behavior |
| --- | --- |
| `DefaultManager` | Uses the base behavior, so operations complete locally without provider-specific persistence. |
| `SqliteManager` | Persists sends and batch edits/deletes through `SqliteProvider`, translates errors into failed statuses, and waits for a pending message create before deleting it. |

## Creating a manager

Extend `ChatManager`, accept Angular's `Injector` and the matching provider, and pass both to `super`:

```ts
import { Injector } from '@angular/core';
import { ChatManager } from '../../classes/ChatManager';
import { Message } from '../../classes/Message';
import { MessageStatus } from '../../enums/MessagesStatus';
import { MyChatProvider } from '../chat-providers/MyChatProvider';

export class MyChatManager extends ChatManager {
  constructor(injector: Injector, provider: MyChatProvider) {
    super(injector, provider);
  }

  protected override async onMessageSendRequested(
    message: Message,
  ): Promise<MessageStatus> {
    try {
      await this.chatProvider.addMessage(this.chat.id(), message);
      return MessageStatus.Sent;
    } catch {
      return MessageStatus.Failed;
    }
  }
}
```

The provider creates one manager for each hydrated chat:

```ts
const manager = new MyChatManager(this.injector, this);
const chat = new Chat(id, name, supporter, manager, options);
```

The `Chat` constructor calls `manager.init(chat)` automatically.

## Protected state and extension points

After initialization, subclasses can use these protected members:

| Member | Purpose |
| --- | --- |
| `chat` | The chat whose operations the manager owns. |
| `chatProvider` | The persistence provider associated with that chat. |
| `chatService` | Removes a successfully deleted chat from application state. |
| `onMessageSendRequested(message)` | Persist one newly appended message. |
| `onMessagesEditRequested(candidates)` | Persist the final set of accepted edits. |
| `onMessagesDeleteRequested(messages)` | Persist the final set of accepted deletions. |
| `onDeleteRequested()` | Delete the persisted chat. |
| `onMessagePropChangeRequested(target, prop, value)` | Handle an explicitly routed synchronized-property change. |

Override the protected hooks rather than the public request methods. The wrappers apply statuses, negotiation, collection updates, and events consistently.

## Sending

`requestMessageSend(message)` sets the message to `Pending`, calls `onMessageSendRequested(...)`, then stores the returned `MessageStatus`.

```ts
protected override async onMessageSendRequested(
  message: Message,
): Promise<MessageStatus> {
  try {
    await this.chatProvider.addMessage(this.chat.id(), message);
    return MessageStatus.Sent;
  } catch {
    return MessageStatus.Failed;
  }
}
```

A failed send remains a failed domain object so it can be displayed and retried.

## Batch edits and deletes

`Message.edit(...)`, `Message.delete(...)`, and `MessageCollection` all create an `EditProposal` or `DeleteProposal`. The manager receives that proposal through `requestMessagesEdit(...)` or `requestMessagesDelete(...)`.

Before persistence, `OperationsNegotiationMediator` exchanges the proposal between:

1. the negotiator supplied by the caller or collection;
2. the manager's policy methods, `isAllowedToEditMessages(...)` and `isAllowedToDeleteMessages(...)`;
3. the chat client's negotiator, which makes the final confirmation decision.

The manager evaluates the initial proposal first. Each policy method may accept (`true`), reject (`false`), or return a revised proposal. A revised proposal goes back to the caller's negotiator, and the two sides alternate for at most ten rounds. Rejection, exhausted rounds, or client cancellation returns `Failed` before persistence and without changing message statuses.

Agent authors normally obtain the caller's negotiator through `supporter.createMessageCollection()` or `chat.user.createMessageCollection()`. A directly constructed `new MessageCollection(chat, negotiator)` supplies a policy for that batch without replacing participant defaults. See the [agent collection examples](../messages/collections.md).

At the final edit decision, the mediator passes the current proposer to the client negotiator. It skips the dialog when the proposer is that same client negotiator instance, as with a user collection whose initial edit proposal the manager accepts unchanged. Other edits and all deletions use the translated CDK confirmation dialog. While shown, the pending proposal is exposed separately from the user's selected messages.

Override the policy methods when a manager needs to enforce backend-specific permission or content rules:

```ts
override isAllowedToDeleteMessages(
  proposal: DeleteProposal,
): OperationsNegotiationAnswer {
  return [...proposal.contents].every((message) => message.deletable());
}
```

### Persisting accepted edits

After negotiation, the manager immediately applies each proposed value and `editedAt` timestamp to the original message and marks it `Pending`. It then calls `onMessagesEditRequested(...)` with the accepted old/new pairs.

```ts
protected override async onMessagesEditRequested(
  candidates: AcceptedEditCandidate[],
): Promise<MessageStatus> {
  try {
    const edited = new Set(
      await this.chatProvider.editBatch(candidates.map(({ newMessage }) => newMessage)),
    );
    return candidates.every(({ newMessage }) => edited.has(newMessage.id()))
      ? MessageStatus.Sent
      : MessageStatus.Failed;
  } catch {
    return MessageStatus.Failed;
  }
}
```

This is intentionally optimistic: when persistence fails, the proposed value and timestamp remain visible and the message status becomes `Failed`; the manager does not roll it back. A successful operation emits `chat.onMessagesEdited`.

### Persisting accepted deletions

The delete wrapper marks every accepted message `Pending`, then calls `onMessagesDeleteRequested(...)` once with the complete set.

```ts
protected override async onMessagesDeleteRequested(
  messages: Message[],
): Promise<MessageStatus> {
  try {
    const deleted = new Set(
      await this.chatProvider.deleteBatch(messages.map((message) => message.id())),
    );
    return messages.every((message) => deleted.has(message.id()))
      ? MessageStatus.Sent
      : MessageStatus.Failed;
  } catch {
    return MessageStatus.Failed;
  }
}
```

The batch hook returns one status for the proposal. If a provider reports only some IDs, return `Failed` so every affected message displays a consistent failure state. On success, the manager removes the messages from `chat.messages` and emits `chat.onMessagesDeleted`.

Do not implement a batch operation as a loop of single-message provider calls. `SqliteManager` uses the provider's set-based `editBatch(...)` and `deleteBatch(...)` APIs; the database edit is transactional. If a delete can race with a message create, wait for the pending create first, as `SqliteManager` does with its `WeakMap` of pending writes.

## Other manager requests

`requestDelete()` calls `onDeleteRequested()` and removes the chat from `ChatService` only when that hook returns `true`.

`requestPropChange(...)` forwards an explicitly routed synchronized-property mutation to `onMessagePropChangeRequested(...)`. Synced signals do not call this automatically: a provider can route them through the manager or install entity-level save handlers with `setSaveChangesHandler(...)`. `SqliteProvider` currently uses entity-level handlers for chat, supporter, and message changes.

Override `handleFile(file)` when an attachment must be uploaded, copied, encrypted, or transformed. The base implementation returns a temporary `URL.createObjectURL(file)`.

## Statuses and retries

Manager hooks return `MessageStatus`. Request wrappers own the transition to `Pending` and then apply the returned final status.

`Message.retry()` repeats its latest requested send, edit, or delete operation through the same manager. Make provider operations idempotent where practical and use stable message IDs to avoid duplicate backend changes.

See [Message collections and batch actions](../messages/collections.md) for the collection API and UI-facing selection behavior.
