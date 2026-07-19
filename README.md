# AI Chat

AI Chat is a desktop chat prototype built with Angular and Electron. It mimics a messaging app UI and lets each chat be powered by an `Agent` class. An agent can be a simple scripted flow, a local AI-backed assistant, or any custom conversation engine you want to plug in.

The project is useful as a foundation for:

- guided support or intake flows
- chatbot experiments
- local AI chat interfaces
- form-like conversations where answers need validation

## What the project does

The app opens as an Electron desktop window and renders the UI with Angular. Chats are stored locally in SQLite, so messages and chat metadata survive app restarts.

Each chat has:

- a `Chat` model with messages and UI metadata
- a `Client` side that sends user messages
- a `Supporter` side that sends agent messages
- an `Agent` instance that decides how the conversation should progress

Out of the box, the codebase includes these agent types:

- `MockAgent`: a scripted flow that asks guided questions with validation
- `FlowAgent`: an XState-backed conversation flow
- `DeepAgent`: a streaming Deep Agents runtime hosted in Electron with local checkpoints

New chats use `DeepAgent` by default. Persisted chats that still reference the former
`AiAgent` name are migrated when they are loaded.

## How it works

High-level flow:

1. Electron starts from `main.js`, the compiled output generated from [main.ts](main.ts).
2. The Angular app is loaded from `dist/ai-chat/browser/index.html`.
3. SQLite tables for chats and messages are initialized in the Electron process.
4. Angular loads chats through `ChatService`.
5. Each chat is hydrated with an `Agent` and a `Supporter`.
6. When the user sends a message, `Client` appends it and triggers `supporter.respond()`.
7. The agent validates the last answer if needed, then decides the next question or reply.

Important files:

- [main.ts](main.ts): Electron app bootstrapping and service/handler registration
- [ipc/](ipc/): Electron IPC handlers compiled by `tsconfig.electron.json`
- [preload.js](preload.js): exposes safe IPC bridge to the renderer
- [src/services/db.service.ts](src/services/db.service.ts): Angular wrapper around Electron IPC database calls
- [src/services/chat.service.ts](src/services/chat.service.ts): chat creation, hydration, persistence
- [src/classes/Agent.ts](src/classes/Agent.ts): base class for all agents
- [src/classes/Question.ts](src/classes/Question.ts): question model with validators and suggested answers
- [src/classes/Supporter.ts](src/classes/Supporter.ts): helper used by agents to send messages

## Run the project

### Prerequisites

- Node.js
- npm
- Windows desktop environment for Electron

### Install dependencies

```bash
npm install
```

### Start the desktop app

```bash
npm start
```

This script:

- builds the Angular app
- launches the Electron window

### Development notes

Useful commands:

```bash
npm run build
npm run watch
npm test
```

Notes:

- `npm start` is the main way to run the desktop app
- `npm run watch` rebuilds Angular in watch mode, but does not restart Electron by itself
- chat and message data are stored in a SQLite database under Electron's user data directory
- Electron TypeScript is compiled with `tsconfig.electron.json`; `package.json` points to the emitted `main.js`. TypeScript imports use `.js` extensions because `module` and `moduleResolution` are set to `NodeNext`.

## Using the Deep Agent

The Deep Agents runtime runs in Electron main and connects to an OpenAI-compatible endpoint.
It defaults to LM Studio at:

```ts
http://127.0.0.1:1234/v1
```

Override the defaults with environment variables:

```text
DEEP_AGENT_BASE_URL=http://127.0.0.1:1234/v1
DEEP_AGENT_MODEL=google/gemma-3-4b
DEEP_AGENT_API_KEY=lm-studio
```

Before using `DeepAgent`, make sure:

- the configured endpoint is reachable
- the configured model exists and supports OpenAI-compatible tool calls

Only completed assistant responses are stored in the chat database. Streaming tokens and tool
activity remain transient. LangGraph execution state is stored separately in
`deepagents-checkpoints.sqlite` under Electron's user-data directory and does not sync across devices.

## What agents are

An agent is the conversation brain behind a chat. It decides:

- what message to send first
- how to react to the latest user message
- whether the user answer is valid
- what question or response comes next

All agents extend the base `Agent` class:

### Agent lifecycle

- `init(chat, supporter)` runs when the agent is attached to a chat
- use `init` to send the first message for an empty chat
- `respond()` runs after the user sends a message
- `lastQuestion` is used to validate answers to the previous prompt

### Sending messages from an agent

Use the `Supporter` helper inside the agent:

- `supporter.ask(question)` to send a `Question`
- `supporter.answer(answer)` to send an `Answer`
- `supporter.sendMessage(message)` to send a regular message

## How to create a new agent

Create a file under `src/agents`, for example:

`src/agents/WelcomeAgent.ts`

Example:

```ts
export class WelcomeAgent extends Agent {
  override init(chat: Chat, supporter: Supporter) {
    super.init(chat, supporter);

    if (chat.messages.length === 0) {
      this.lastQuestion = new Question('What is your email?', {
        validator: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        validationErrorMessage: 'Please enter a valid email address.',
      });
      this.lastQuestion.tag = 'email';
      supporter.ask(this.lastQuestion);
    }
  }

  override async respond(): Promise<void> {
    super.respond();

    if (this.lastQuestion?.tag === 'email') {
      this.supporter.sendMessage('Thanks, we saved your email.');
    }
  }
}
```

After creating the class, declare it in [src/app/app-agents.module.ts](src/app/app-agents.module.ts). 

```ts
@AgentsModule({
  agents: {
    DeepAgent,
    FlowAgent,
    MockAgent,
    WelcomeAgent
  },
})
export class AppAgentsModule {}
```

### Tips for building agents

- always call `super.init(...)` and `super.respond()`
- use `Question` when you want built-in validation
- store conversation state in `lastQuestion.tag` or by inspecting previous messages
- use `chat.messages` if you need full conversation history
- keep agent logic focused on conversation flow, not persistence

### Register a new agent

Agents must be declared in [src/app/app-agents.module.ts](src/app/app-agents.module.ts). This module is registered at app startup and is what `AgentsService` uses to know which agent classes exist.

Current example:

```ts
@AgentsModule({
  agents: {
    DeepAgent,
    FlowAgent,
    MockAgent,
  },
})
export class AppAgentsModule {}
```

If you add `WelcomeAgent`, register it there too:

```ts
import { WelcomeAgent } from '../agents/WelcomeAgent';

@AgentsModule({
  agents: {
    DeepAgent,
    FlowAgent,
    MockAgent,
    WelcomeAgent,
  },
})
export class AppAgentsModule {}
```

After the agent is declared, it can be created and used when chats are loaded or created. The simplest place to start is [src/app/home/home-component.ts](src/app/home/home-component.ts).

Current examples:

- loading existing chats: `this.chatService.getChats()`
- creating a new chat: `initialAgent: Agent = new MockAgent(this.injector)`

To use your custom agent, replace `new MockAgent()` with your own class instance. replacing agents via the home component is only needed for the inital agent, for the following agents use `supporter.setAgent(new SomeAgent())` in the previous agent 

If your agent needs Angular services, follow the `DeepAgent` pattern and pass `Injector` into the constructor.

## Validation and guided flows

The `Question` class supports:

- regex validation
- structured validator specs
- validation error messages
- predefined possible answers

That makes it a good fit for:

- onboarding flows
- support troubleshooting trees
- lead capture
- step-by-step forms in chat format

`MockAgent` is the best reference in this repo for a guided flow with validation.

## Project structure

```text
src/
  agents/       Agent implementations
  app/          Angular UI components
  classes/      Core chat, message, question, client, supporter models
  services/     AI, database, Electron, profile, and chat services
main.ts         Electron main process and SQLite logic
preload.js      Electron preload bridge
```

## Summary

This project is a local desktop chat app where each conversation is powered by an agent. Angular handles the UI, Electron provides the desktop shell, SQLite stores the data, and agents define the conversation behavior. If you want to extend the app, the main entry point is usually creating a new `Agent` class and wiring it into chat creation.
