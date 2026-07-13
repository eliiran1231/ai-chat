# What is a chat provider?

A `ChatProvider` connects the chat domain to one storage and synchronization backend. It creates and restores chats, persists message operations, deletes chats, and exposes the authentication state required to access that backend.

Providers are explicit application integrations. Each provider owns the chats it creates, and its manager keeps that ownership attached to the chat throughout later mutations.

# Built-in provider

`SqliteProvider` is the current built-in provider. Its public metadata identifies it as the PowerSync integration. It uses `DbService` for Electron database operations, `PowerSyncAuthenticationService` for authentication and sync state, `SqliteManager` for mutations, and `SqliteMessagesSource` for lazy history loading.

When it hydrates messages, it restores their concrete `Message`, `Question`, or `Answer` type and reconnects question validators, validation messages, possible answers, and selection mode.

# Provider metadata

Every provider exposes a `metadata` object:

| Property | Type | Meaning |
| --- | --- | --- |
| `id` | `string` | Stable, unique provider ID used for provider-scoped chat lifecycle operations. |
| `displayName` | `string` | Human-readable name shown in the provider list. |
| `description` | `string` | Short explanation of the integration. |
| `avatarUrl` | `string` | Image displayed on the provider card. |
| `authenticationComponent` | `Type<unknown>` | Angular component rendered by the provider connection dialog. |

Do not derive persisted ownership from `displayName`. Use a stable `id` that will not change when UI copy changes.

# Provider interface

A provider implements these members:

| Member | Responsibility |
| --- | --- |
| `authentication` | Exposes login, registration, logout, current-user, auth-state, and sync-state behavior. |
| `createChat(name, initialAgent, options)` | Persists and hydrates a new chat. |
| `getChats()` | Restores every chat owned by the provider. |
| `addMessage(chatId, message)` | Persists a new message. |
| `editMessage(message)` | Persists an existing message's current state. |
| `deleteMessage(messageId)` | Deletes a persisted message. |
| `deleteChat(chatId)` | Deletes a persisted chat. |

Methods may be synchronous or asynchronous, although persistent integrations will normally return promises.

# Creating a provider

The following skeleton shows the required surface. The storage-specific details are intentionally represented by a backend service:

```ts
import { inject, Injectable, Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat, ChatOptions } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { Uuid } from '../../interfaces/db/Uuid';
import { ChatProvider } from '../../interfaces/ChatProvider';

@Injectable()
export class MyChatProvider implements ChatProvider {
  readonly metadata = {
    id: 'my-provider',
    displayName: 'My Provider',
    description: 'Stores chats in My Backend.',
    avatarUrl: '/assets/my-provider.svg',
    authenticationComponent: MyProviderConnectComponent,
  };

  readonly authentication = inject(MyAuthenticationProvider);
  private readonly injector = inject(Injector);
  private readonly backend = inject(MyBackendService);

  async createChat(
    name: string,
    initialAgent: Agent,
    options: ChatOptions = {},
  ): Promise<Chat> {
    const record = await this.backend.createChat(name, options);
    return this.hydrateChat(record, initialAgent, true);
  }

  async getChats(): Promise<Chat[]> {
    const records = await this.backend.getChats();
    return Promise.all(
      records.map(record =>
        this.hydrateChat(record, this.restoreAgent(record.agentName), false),
      ),
    );
  }

  async addMessage(chatId: Uuid, message: Message): Promise<void> {
    await this.backend.addMessage(chatId, message);
  }

  async editMessage(message: Message): Promise<void> {
    await this.backend.editMessage(message);
  }

  async deleteMessage(messageId: Uuid): Promise<void> {
    await this.backend.deleteMessage(messageId);
  }

  async deleteChat(chatId: Uuid): Promise<void> {
    await this.backend.deleteChat(chatId);
  }
}
```

`restoreAgent(...)` and `hydrateChat(...)` are provider-specific helpers, not members of the `ChatProvider` interface.

# Hydrating chats

Creating and restoring a chat should follow the same hydration sequence:

1. Restore or create the supporter and its persisted context.
2. Create a manager linked to this provider.
3. Construct the `Chat` with its persisted options.
4. Install chat, supporter, and message save handlers.
5. Add the provider's `MessageSource` instances in newest-to-oldest source order.
6. Load the first message chunk.
7. Subscribe to agent switches if the selected agent name is persisted.
8. Call `supporter.setAgent(initialAgent, isNewChat)`.

The `isNewChat` value must come from the create-versus-restore operation. Do not infer it from an empty `messages()` array, because messages may not have finished loading yet.

Loading history before setting the agent allows the base agent to recover `lastQuestion` from the restored conversation. Hydrated messages must be connected to the chat with `message.setChat(chat)` so edit, delete, and retry operations can reach the manager.

# Authentication

The provider's `authentication` object implements `AuthenticationProvider`. It exposes signal-based state:

- `currentUser`, `loggedIn`, `state`, and `syncState`;
- `register(...)`, `login(...)`, `logout()`, and `getCurrentUser()`;
- an `options.logoutPolicy` that declares whether logout clears local data.

The provider list checks `getCurrentUser()` on initialization and uses `loggedIn()` to choose between connect and disconnect actions. After a successful connection, `ChatService.loadProviderChats(provider)` reloads only that provider's chats. On logout, `ChatService.clearChats(provider.metadata.id)` removes only chats belonging to that provider.

# Registering a provider

Register implementations with the Angular multi-provider token in `AppChatProvidersModule`:

```ts
import { NgModule } from '@angular/core';
import { CHAT_PROVIDER } from '../services/chat-providers.module';
import { MyChatProvider } from '../chat-providers/MyChatProvider';

@NgModule({
  providers: [
    {
      provide: CHAT_PROVIDER,
      useClass: MyChatProvider,
      multi: true,
    },
  ],
})
export class AppChatProvidersModule {}
```

`multi: true` is required. Without it, one registration replaces the provider catalog instead of contributing to it.

The application imports the module with:

```ts
importProvidersFrom(AppChatProvidersModule)
```

Consumers inject `CHAT_PROVIDER` as `ChatProvider[]`. `ChatService` uses the catalog to load chats, while the provider UI uses the same catalog to display connection options.

# Persistence responsibilities

A provider is responsible for preserving enough data to recreate the domain types accurately. For messages, that includes distinguishing `Message`, `Question`, and `Answer` and restoring question-specific fields such as validators, validation errors, possible answers, and selection mode.

After hydration, install save handlers for synchronized entities. `SqliteProvider` uses chat-, supporter-, and message-level commit functions so later synced-signal changes are written through the same provider that owns the chat.

Use stable chat and message IDs for create, edit, delete, and retry operations. A provider should reject failures to its manager; the manager translates them into `MessageStatus.Failed` or a failed chat deletion without incorrectly removing local state.
