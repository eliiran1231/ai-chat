# Message collections

Use `MessageCollection` from an agent when several existing messages belong to one edit or delete operation. Add the messages you want to affect, then submit one batch through the chat's negotiation and persistence flow. A collection owns its own membership; it does not change the user's UI selection.

## Choose a collection for the operation

After `super.init(...)`, an agent can create collections through either participant:

```ts
const supporterBatch = this.supporter.createMessageCollection();
const userBatch = this.chat.user.createMessageCollection();
```

| Creation path | Negotiator used |
| --- | --- |
| `this.supporter.createMessageCollection()` | `supporter.negotiator`, falling back to `defaultNegotiator` when unset. |
| `this.chat.user.createMessageCollection()` | `chat.user.negotiator`, the existing client negotiator. |
| `new MessageCollection(this.chat, batchNegotiator)` | The negotiator supplied for this collection. |
| `new MessageCollection(this.chat)` | `defaultNegotiator`, which accepts counterproposals. |

Each factory call returns a **new, empty collection**. It does not select all of that participant's messages, filter by sender, or return a shared selection. Add the intended messages explicitly. Use the supporter factory for an agent-initiated action and the user factory for an action representing the user's request.

To establish a reusable supporter policy, assign `this.supporter.negotiator` before creating its collections. Each collection keeps the negotiator reference supplied at creation; replacing the supporter property later does not update existing collections. For a policy that belongs to just one batch, construct a collection directly as shown below.

## Choose the messages

For example, this method inside an `Agent` subclass requests deletion of loaded, deletable messages tagged as temporary:

```ts
async removeTemporaryMessages(): Promise<void> {
  const batch = this.supporter.createMessageCollection();
  for (const message of this.chat.messages()) {
    if (message.tag() === 'temporary' && message.deletable()) {
      batch.addMessage(message);
    }
  }

  if (!batch.canDelete()) return;
  const status = await batch.delete();
  if (status === MessageStatus.Failed) return;

  // Continue the agent's flow after the batch succeeds.
}
```

Import `MessageStatus` from `src/enums/MessagesStatus.ts`. `chat.messages()` contains loaded history; this example does not search older messages in storage.

Membership can also be adjusted individually:

```ts
const selected = this.supporter.createMessageCollection();

selected.addMessage(firstMessage);
selected.addMessage(secondMessage);
selected.removeMessage(firstMessage);
```

`addMessage(...)` also attaches the message to that chat, so only add messages belonging to the collection's chat. The collection uses a `Set`, so adding the same object again does not duplicate it. Its `messages` property is a read-only Angular signal; read the current selection with `selected.messages()`.

`clearMessages()` clears membership without deleting messages from the chat. The collection preserves insertion order, and that order is used for the index supplied to batch edit callbacks.

## Action availability

Use the computed signals to decide whether to expose each batch action:

| Signal | True when |
| --- | --- |
| `canDelete` | The selection is non-empty and every message is deletable. |
| `canEdit` | The selection is non-empty and every message was sent by the client and is editable. |

These are availability signals rather than guards. Callers should check the relevant signal before invoking an action, especially when the selection can change while an operation control is visible.

## Deleting a selection

`delete()` creates a `DeleteProposal` from the current selection and passes it through the chat's negotiation and manager layers:

```ts
if (selected.canDelete()) {
  const status = await selected.delete();
}
```

After negotiation succeeds, the manager marks the accepted messages pending, requests the batch delete from its provider, and reports the resulting `MessageStatus`. On a non-failed result, `MessageCollection` clears its membership and the manager emits `chat.onMessagesDeleted`. A `Failed` result retains collection membership. Rejection or cancellation also returns `Failed`, so that result alone does not prove a storage error occurred.

## Editing a selection

`edit(...)` creates a clone for every selected message and supplies the original message and its zero-based selection index to the updater:

```ts
if (selected.canEdit()) {
  await selected.edit((message, index) =>
    `${index + 1}. ${message.value().trim()}`,
  );
}
```

The generated `EditProposal` includes the old and proposed message for each entry. The manager applies the proposed value and edit timestamp optimistically while the provider request is pending. If that request fails, the proposed value remains visible and the message status becomes `Failed`; it is not rolled back. On success, the manager emits `chat.onMessagesEdited`.

Editing does not clear the selection. Clear it explicitly when that matches the calling UI's workflow.

## Negotiation

The manager evaluates the initial proposal first. If it returns a counterproposal, the collection's negotiator decides whether to accept, reject, or revise it. The two sides alternate until one accepts, one rejects, or the mediator reaches its limit of ten rounds. This means a custom collection negotiator is **not an initial validation hook**: validate the messages you add and check `canEdit()` or `canDelete()` before submitting.

Implement both `OperationsNegotiator` methods. Each may return `true` to accept, `false` to reject, or an `EditProposal` / `DeleteProposal` to counter, synchronously or through a promise. Keep counterproposals consistent with the operation being negotiated. The interface permits additional `unknown` arguments, but ordinary negotiation calls currently supply only the proposal.

### A negotiator for one batch

Suppose an agent is trimming a specific set of client answers and must reject any manager counterproposal that adds messages or changes the intended replacement text. Inside an agent method (imports shown relative to `src/agents/<agent>/`):

```ts
import { MessageCollection } from '../../classes/MessageCollection';
import type { OperationsNegotiator } from '../../interfaces/OperationsNegotiator';

// Method body, after the agent has initialized:
const messages = this.chat.messages().filter((message) =>
  message.from()?.type === 'client' &&
  message.editable() &&
  message.tag() === 'answer' &&
  message.value() !== message.value().trim(),
);
const replacements = new Map(
  messages.map((message) => [message.id(), message.value().trim()]),
);

const batchNegotiator: OperationsNegotiator = {
  negotiateBatchEdit: (proposal) => [...proposal.contents].every(
    ({ oldMessage, newMessage }) =>
      replacements.has(oldMessage.id()) &&
      newMessage.id() === oldMessage.id() &&
      newMessage.value() === replacements.get(oldMessage.id()),
  ),
  negotiateBatchDelete: () => false,
};

const batch = new MessageCollection(this.chat, batchNegotiator);
messages.forEach((message) => batch.addMessage(message));
if (batch.canEdit()) {
  const status = await batch.edit((message) => replacements.get(message.id())!);
  // Check status before continuing any flow that depends on this edit.
}
```

This policy accepts a counterproposal containing a subset of the planned edits, but rejects additional messages or different values. It applies only to this collection; neither participant's default negotiator changes.

### Client confirmation

After negotiation accepts a proposal, the client makes the final decision. For edits, the mediator passes the current proposer to `ClientNegotiator`. If that proposer is the same client negotiator instance, it accepts without opening another dialog. Thus an unchanged edit from `chat.user.createMessageCollection()` skips the final dialog; a manager counterproposal may still require confirmation. Supporter and custom collection edits normally prompt. Deletes always use the confirmation dialog in the current implementation, including those from a user collection.

When a dialog is shown, its text is translated and `activeProposal` exposes the pending proposal separately from user selection. A custom batch negotiator does not bypass this final client decision.

## Reacting to the completed batch

Agents can override `onMessagesEdited(messages)` and `onMessagesDeleted(messages)` to react to successful batches. The base agent subscribes during `init(...)`; call `super.onMessagesDeleted(messages)` when overriding deletion handling to retain its updates to `lastQuestion` and `lastMessage`. Failed or rejected batches do not emit these success events.

Collection operations do not register a batch retry on each message. To repeat a batch, call the collection operation again (and expect negotiation again), rather than relying on `Message.retry()` to remember it.

See also:

- [Messages, questions, and answers](introduction.md)
- [Message lifecycle](lifecycle.md)
- [Chat managers](../chats/managers.md)
