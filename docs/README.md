# AI Chat framework documentation

This documentation explains how to build conversation agents, add chat backends, persist state, and extend the Angular and Electron application safely.

## Start here

- [Getting started](getting-started.md) walks through installation, running the app, creating an agent, and opening a chat.
- [Architecture](architecture.md) explains the boundaries between the Angular renderer, chat domain, providers, and Electron process.
- [Testing](testing.md) covers Angular unit tests and Electron-side Vitest suites.

## Agents

- [Agent introduction](agents/introduction.md)
- [Agent lifecycle functions](agents/functions.md)
- [Possible answers](agents/possible%20answers.md)
- [Validators](agents/validators.md)
- [State-machine flows](agents/flows.md)

## Chats

- [Chat introduction](chats/introduction.md)
- [Message loaders and sources](chats/loaders.md)
- [Chat managers](chats/managers.md)
- [Chat providers](chats/providers.md)

## Messages and participants

- [Messages, questions, and answers](messages/introduction.md)
- [Message lifecycle, statuses, and retries](messages/lifecycle.md)
- [Attachments](messages/attachments.md)
- [Client and supporter participants](participants/introduction.md)
- [Supporter context and agent switching](participants/context-and-switching.md)

## State and integrations

- [Signals and persistence](state/signals.md)
- [Authentication and synchronization](authentication/introduction.md)
- [PowerSync backend contract](powersync-backend-contract.md)

## Extension points

Use the guide that matches the behavior you want to add:

| Goal | Primary extension point | Guide |
| --- | --- | --- |
| Implement conversation logic | `Agent` | [Agent introduction](agents/introduction.md) |
| Build a guided state-machine flow | `Agent` and XState | [State-machine flows](agents/flows.md) |
| Add a storage or sync backend | `ChatProvider` | [Chat providers](chats/providers.md) |
| Translate domain mutations into backend calls | `ChatManager` | [Chat managers](chats/managers.md) |
| Load older history | `MessageSource` | [Message loaders and sources](chats/loaders.md) |
| Add backend authentication | `AuthenticationProvider` | [Authentication](authentication/introduction.md) |
| Persist signal-backed model changes | `SyncedEntity` | [Signals and persistence](state/signals.md) |

Classes marked `@internal` are collaboration seams used by the framework itself. Application extensions should prefer the public methods documented here instead of accessing internal properties with bracket notation.
