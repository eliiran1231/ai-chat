# What is a chat?

A `Chat` is the domain object that represents one conversation. It owns the visible conversation state, connects the client and supporter participants, exposes message events, and delegates persistence-sensitive operations to a `ChatManager`.

A chat does not talk to a database or remote API directly. The responsibilities are separated as follows:

- `Chat` owns conversation state and UI-facing signals.
- `Client` and `Supporter` append messages from their respective sides.
- `ChatManager` handles requested sends, edits, deletions, property changes, and attachments.
- `ChatProvider` creates, restores, and persists chats for a storage backend.
- `MessageLoader` loads older history from one or more `MessageSource` instances.
- `ChatService` keeps the application-wide chat collection and selected chat state.

# Creating a chat

Application code should normally create chats through `ChatService`, not by calling the `Chat` constructor directly:

```ts
import { Component, inject } from '@angular/core';
import { AgentsService } from '../../services/agents.service';
import { ChatService } from '../../services/chat.service';

export class NewChatButtonComponent {
  private readonly chats = inject(ChatService);
  private readonly agents = inject(AgentsService);

  async createChat(): Promise<void> {
    const agent = this.agents.getAgentByName('MockAgent');
    const chat = await this.chats.createChat(agent);
    console.log(chat.id());
  }
}
```

`ChatService.createChat(...)` accepts an initial agent and a provider. When they are omitted, it uses `AiAgent` and the default `SqliteProvider`. It also prevents concurrent creation requests from producing duplicate chats and adds the completed chat to the service collection.

To create a chat with a specific registered provider:

```ts
const chat = await this.chatService.createChat(initialAgent, provider);
```

Provider implementations construct the domain object after creating or loading their records:

```ts
const supporter = new Supporter(supporterId, 'Supporter');
const manager = new MyChatManager(injector, this);
const chat = new Chat(chatId, 'New chat', supporter, manager, {
  subtitle: 'Tap to start chatting',
  timeLabel: 'now',
});
```

The `Chat` constructor connects the supporter to the chat, initializes the manager, creates the client participant and message loader, and initializes signal synchronization. The provider must still configure persistence handlers, message sources, and the initial agent.

# Chat properties

Most chat properties are Angular signals. Read them by calling the property and update writable values with `set` or `update`.

| Property | Type | Meaning |
| --- | --- | --- |
| `id` | `Signal<Uuid>` | Stable identifier assigned by the provider. |
| `name` | `SyncedSignal<string>` | Display name of the conversation. |
| `status` | `SyncedSignal<string>` | Provider-defined chat status label. |
| `avatar` | `SyncedSignal<Avatar>` | Text or image avatar shown for the chat. |
| `subtitle` | `SyncedSignal<string>` | Secondary text shown in chat lists and headers. |
| `timeLabel` | `SyncedSignal<string>` | Display label for the chat time. |
| `unreadCount` | `SyncedSignal<number>` | Number of unread supporter messages. |
| `highlightTime` | `SyncedSignal<boolean>` | Whether the time label should be emphasized. |
| `avatarRing` | `SyncedSignal<boolean>` | Whether the avatar uses its highlighted ring style. |
| `tipLabel` | `SyncedSignal<string>` | Optional UI tip or badge text. |
| `draftMessage` | `WritableSignal<string>` | Unsaved text currently entered by the client. |
| `messages` | `WritableSignal<Message[]>` | The currently hydrated messages in chronological display order. |
| `isRead` | `Signal<boolean>` | `true` when the unread count is zero and every loaded message is read. |
| `active` | `WritableSignal<boolean>` | Whether this chat is currently selected. |
| `user` | `Client` | Client-side message API. |
| `supporter` | `Supporter` | Supporter-side message API controlled by an agent. |
| `loader` | `MessageLoader` | Coordinator used to load older history. |
| `manager` | `ChatManager` | Internal mutation boundary used by collaborating chat-domain classes. |

The constructor's `ChatOptions` object accepts `status`, `avatar`, `subtitle`, `timeLabel`, `unreadCount`, `highlightTime`, `avatarRing`, and `tipLabel`. Defaults are applied when a value is omitted.

# Sending messages

Use the participant APIs instead of modifying `chat.messages` directly:

```ts
await chat.user.ask('Can someone help me?');
await chat.user.answer('Yes');

await chat.supporter.sendMessage('A supporter has joined.');
await chat.supporter.ask('What is your account number?');
await chat.supporter.answer('Your request has been approved.');
```

These methods assign the sender, connect the message to its chat, append it, and ask the manager to persist it. Client messages also trigger the current agent's `respond()` flow after a successful send.

Use `Message.edit()` and `Message.delete()` for existing messages. They go through the same manager boundary and emit `chat.onMessageEdited` or `chat.onMessageDeleted` only after the operation succeeds.

# Chat lifecycle

`ChatService.loadChats()` asks every registered provider for its chats, combines successful results, and indexes each chat by ID. A provider failure is logged without discarding chats returned by other providers.

Selecting a chat sets `active`, clears its unread count, and marks loaded supporter messages as read. `chat.markAsRead()` can perform the same operation directly.

Deleting a chat is also delegated:

```ts
await chat.delete();
```

The manager asks its provider to delete the persisted chat. `ChatService` removes the local chat only when the provider reports success.

For attachments, call `chat.processFileUrl(file)`. The manager decides how the file is converted into a usable URL; the base implementation creates an object URL.
