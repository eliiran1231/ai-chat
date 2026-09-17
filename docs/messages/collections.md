# Message collections

`MessageCollection` owns a selected, de-duplicated set of messages for batch actions in one `Chat`. It is UI-agnostic: a component can render the selection and enable its controls from the collection's signals, while the collection creates proposals and delegates the operation to the chat manager.

## Creating a selection

Construct the collection with the chat that owns the messages, then add and remove objects as the selection changes:

```ts
const selected = new MessageCollection(chat);

selected.addMessage(firstMessage);
selected.addMessage(secondMessage);
selected.removeMessage(firstMessage);
```

`addMessage(...)` also attaches the message to that chat. The collection uses a `Set`, so adding the same object again does not duplicate it. Its `messages` property is a read-only Angular signal; read the current selection with `selected.messages()`.

`clearMessages()` removes every selected message. The collection preserves insertion order, and that order is used for the index supplied to batch edit callbacks.

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

The manager marks the proposed messages pending, requests the batch delete from its provider, and reports the resulting `MessageStatus`. On a non-failed result, `MessageCollection` clears its selection and the manager emits `chat.onMessagesDeleted`. A failed operation keeps the collection selected so the UI can show the failed state and offer a later retry.

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

The optional constructor `negotiator` controls how the collection responds when the manager negotiates a batch proposal. It defaults to `defaultNegotiator`, which accepts the initial proposal. The manager then asks the chat's client negotiator for the final decision. The built-in client negotiator displays a translated confirmation dialog and exposes the active proposal so the UI can distinguish proposed messages from user-selected messages.

See also:

- [Messages, questions, and answers](introduction.md)
- [Message lifecycle](lifecycle.md)
