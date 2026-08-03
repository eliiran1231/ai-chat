# AI Chat

AI Chat is an Angular and Electron framework for building desktop conversations backed by scripted agents, state machines, or local AI models. Its chat domain is independent of persistence: agents own conversation decisions, while providers and managers own storage, authentication, and synchronization.

The current application includes:

- an Angular 22 messaging interface;
- Electron IPC with a context-isolated preload bridge;
- local PowerSync SQLite storage;
- optional authenticated synchronization with a self-hosted PowerSync and PostgreSQL backend;
- scripted, XState, and local-AI agent examples;
- validation, possible answers, attachments, editing, deletion, retry, search, and lazy history loading.

## Documentation

Start with the [documentation index](docs/README.md) or the [getting-started guide](docs/getting-started.md).

| Area | Guide |
| --- | --- |
| System boundaries | [Architecture](docs/architecture.md) |
| Creating agents | [Agent introduction](docs/agents/introduction.md) |
| Agent overrides | [Agent lifecycle functions](docs/agents/functions.md) |
| Guided XState flows | [State-machine agents](docs/agents/flows.md) |
| Chats and participants | [Chat introduction](docs/chats/introduction.md) |
| Messages and statuses | [Message documentation](docs/messages/introduction.md) |
| Persistence behavior | [Signals and persistence](docs/state/signals.md) |
| Storage integrations | [Chat providers](docs/chats/providers.md) |
| Authentication and sync | [Authentication](docs/authentication/introduction.md) |
| Test strategy | [Testing](docs/testing.md) |
| Backend requirements | [PowerSync backend contract](docs/powersync-backend-contract.md) |

## How it works

The renderer and main process have separate responsibilities:

1. Angular renders chats and owns the in-memory domain objects.
2. `Client` appends user questions or answers.
3. `ChatManager` translates message operations into provider calls and statuses.
4. `ChatProvider` persists chats, supporters, and messages.
5. `Supporter` invokes the current `Agent` after a successful client message.
6. The agent decides which supporter message, question, or answer comes next.
7. Electron IPC connects the renderer provider to local database, authentication, and synchronization services.

Older message history is loaded lazily. A `MessageLoader` exhausts each registered `MessageSource` before moving to the next source, allowing multiple history segments to be chained in a predictable order.

## Built-in agents

The application explicitly registers three agents in `src/app/app-agents.module.ts`:

| Agent | Purpose |
| --- | --- |
| `AiAgent` | Sends the latest client message to a local OpenAI-compatible endpoint. |
| `MockAgent` | Demonstrates a scripted support questionnaire with validators and possible answers. |
| `FlowAgent` | Demonstrates an XState-driven, persistable conversation flow. |

Agent registration keys are persisted names. Keep them stable or migrate stored chats when renaming an agent.

## Chat provider

`SqliteProvider` is currently registered through the Angular `CHAT_PROVIDER` multi token. Its public integration is presented as PowerSync and combines:

- `PowerSyncAuthenticationService` for authentication and synchronization state;
- `DbService` and Electron IPC for local database operations;
- `SqliteManager` for message and chat mutations;
- `SqliteMessagesSource` for paginated history hydration.

The database supports local operations without an authenticated session. When a session exists, PowerSync connects and uploads queued local changes. Logging out follows the provider's explicit local-data policy.

## Prerequisites

- Node.js
- npm
- Windows desktop environment for the current Electron setup
- native build tooling supported by Electron when rebuilding `better-sqlite3`

Remote synchronization additionally requires the PowerSync and backend services described by the repository configuration and [backend contract](docs/powersync-backend-contract.md).

## Install

```powershell
npm install
```

The post-install script rebuilds `better-sqlite3` for the installed Electron version.

## Run

Build the Angular application and Electron process, then open the desktop app:

```powershell
npm start
```

For an Angular development build followed by Electron:

```powershell
npm run dev
```

`npm run watch` watches the Angular renderer only; it does not restart Electron.

## Local AI agent

`AiAgent` currently calls the OpenAI-compatible endpoint configured in `src/services/ai.service.ts`:

```text
http://localhost:1234/v1/chat/completions
```

The configured model is:

```text
google/gemma-3-4b
```

Start LM Studio or another compatible local server with that model before using `AiAgent`. `MockAgent` and `FlowAgent` do not require an AI server.

## Build and test

```powershell
npm run build
npm test -- --watch=false
npm run test:electron
```

- `npm run build` builds Angular and compiles Electron TypeScript.
- Angular tests cover domain helpers and standalone components.
- Electron Vitest suites cover database behavior, authentication, synchronization, connector outcomes, and production contracts.

On Windows automation, use `npm.cmd` if the shell does not resolve npm's PowerShell shim.

## Project structure

```text
src/
  agents/              Conversation implementations
  app/                 Angular UI and registration modules
  authenticators/      Renderer-side authentication providers
  chat-managers/       Mutation and status policies
  chat-providers/      Chat persistence integrations
  classes/             Chat, message, participant, and agent domain classes
  message-sources/     Lazy history sources
  services/            Angular services and Electron bridge wrappers
  signals/             Persistence-aware signal helpers
  testing/             Shared renderer test doubles

ipc/                   Electron IPC handlers
services/              Electron database, auth, sync, and upload services
shared/                Contracts shared by renderer and main process
tests/electron/         Node-based Electron and integration tests
docs/                   Framework and backend documentation
powersync/              PowerSync service and sync configuration
```

## Adding an extension

- Add conversation behavior by extending `Agent` and registering it in `AppAgentsModule`.
- Add a backend by implementing `ChatProvider`, pairing it with a `ChatManager`, and registering it with `multi: true`.
- Add older history by extending `MessageSource` and appending it to a chat's loader.
- Add provider authentication by implementing `AuthenticationProvider` and supplying an authentication component in provider metadata.

The [documentation index](docs/README.md) contains the complete contracts and examples for each extension point.
