# What is a chat manager?

A `ChatManager` is the mutation boundary between chat-domain objects and a `ChatProvider`. Messages, chats, clients, and supporters request operations from the manager instead of calling storage APIs themselves.

The manager controls how these operations are executed:

- sending, editing, and deleting a message;
- reacting to synchronized property changes;
- deleting a chat;
- converting an attached file into a usable URL.

The base manager accepts every operation locally. A persistent manager overrides the protected hooks and delegates them to its provider.

# Built-in managers

The repository includes two manager implementations:

| Manager | Behavior |
| --- | --- |
| `DefaultManager` | Uses the base behavior, so operations succeed locally without provider-specific persistence. |
| `SqliteManager` | Delegates message and chat operations to `SqliteProvider`, translates errors into failed statuses, and waits for a pending message create before deleting that message. |

# Creating a chat manager

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
    } catch (error) {
      console.error(error);
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

# Manager properties

Subclasses can access these protected properties after initialization:

| Property | Type | Meaning |
| --- | --- | --- |
| `chat` | `Chat` | The chat whose operations this manager owns. |
| `chatProvider` | `ChatProvider` | The persistence provider associated with the chat. |
| `chatService` | `ChatService` | Application-level service used to remove a successfully deleted chat. |

# Request lifecycle

Public `request...` methods are called by the domain objects. The message send, edit, and delete wrappers set a message to `Pending`, run the corresponding protected hook, and then apply the returned `MessageStatus`. Chat deletion and property-change requests use their own result types.

Do not normally override these public wrappers. Override the protected hook that contains the provider-specific operation.

## `onMessageSendRequested(message)`

Called after a client or supporter message has been appended to the chat. Return `Sent` or `Read` on success and `Failed` on failure.

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

A failed send remains in the chat with a failed status so it can be displayed and retried.

## `onMessageEditRequested(message, oldMessage)`

Called with the edited message and a clone containing the previous state. The manager wrapper applies the proposed value and edit timestamp before invoking the hook.

```ts
protected override async onMessageEditRequested(
  message: Message,
  oldMessage: Message,
): Promise<MessageStatus> {
  try {
    await this.chatProvider.editMessage(message);
    return MessageStatus.Sent;
  } catch {
    // Use oldMessage here if the backend requires an explicit rollback.
    return MessageStatus.Failed;
  }
}
```

The public `Message.edit()` emits the chat edit event only after the manager reports success.

## `onMessageDeleteRequested(message)`

Called before a message is removed from `chat.messages`. The message stays visible when the hook returns `Failed`.

```ts
protected override async onMessageDeleteRequested(
  message: Message,
): Promise<MessageStatus> {
  try {
    await this.chatProvider.deleteMessage(message.id());
    return MessageStatus.Sent;
  } catch {
    return MessageStatus.Failed;
  }
}
```

If sends and deletes can race, wait for the pending create operation before deleting. `SqliteManager` keeps pending message writes in a `WeakMap` for this reason.

## `onMessagePropChangeRequested(target, prop, newValue)`

Provides a manager-level path for a synchronized property change. Override this hook when the backend needs a custom property-level update operation. The base implementation accepts the change and returns `Read`.

Synced signals call the handler installed on their owning `SyncedEntity`; they do not call this manager hook automatically. A provider may wire that handler to `manager.requestPropChange(...)`, or it may install entity-level persistence directly with `setSaveChangesHandler(...)`. `SqliteProvider` currently uses direct chat-, supporter-, and message-level save handlers.

## `onDeleteRequested()`

Called when `chat.delete()` is requested. Return `true` only after the provider has deleted the persisted chat:

```ts
protected override async onDeleteRequested(): Promise<boolean> {
  try {
    await this.chatProvider.deleteChat(this.chat.id());
    return true;
  } catch {
    return false;
  }
}
```

The base `requestDelete()` removes the chat from `ChatService` only when this hook returns `true`.

## `handleFile(file)`

Override this function when attachments need to be uploaded, copied, encrypted, or converted before use:

```ts
override async handleFile(file: File): Promise<string> {
  return this.uploadService.upload(file);
}
```

The base implementation returns `URL.createObjectURL(file)`, which is appropriate only for local, temporary use.

# Statuses and retries

Manager hooks communicate results with `MessageStatus`. The request wrapper owns the `Pending` transition and applies the final status returned by the hook.

`Message.retry()` repeats the last requested send, edit, or delete operation through the same manager. Manager operations should therefore be safe to retry or protected by stable message IDs and backend idempotency rules.
