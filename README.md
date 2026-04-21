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

Out of the box, the codebase already includes two agent types:

- `MockAgent` in [src/agents/MockAgent.ts](src/agents/MockAgent.ts): a scripted flow that asks for greeting, name, and age with validation
- `AiAgent` in [src/agents/AiAgent.ts](src/agents/AiAgent.ts): sends the latest user message to a local OpenAI-compatible endpoint and replies with the model output

At the moment, the home screen loads chats with `AiAgent` by default in [src/app/home/home-component.ts](src/app/home/home-component.ts).

## How it works

High-level flow:

1. Electron starts from [main.js](main.js).
2. The Angular app is loaded from `dist/ai-chat/browser/index.html`.
3. SQLite tables for chats and messages are initialized in the Electron process.
4. Angular loads chats through `ChatService`.
5. Each chat is hydrated with an `Agent` and a `Supporter`.
6. When the user sends a message, `Client` appends it and triggers `supporter.respond()`.
7. The agent validates the last answer if needed, then decides the next question or reply.

Important files:

- [main.js](main.js): Electron app bootstrapping, SQLite schema, IPC handlers
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

## Using the AI agent

`AiAgent` is wired to a local OpenAI-compatible chat endpoint in [src/services/ai.service.ts](src/services/ai.service.ts):

```ts
http://localhost:1234/v1/chat/completions
```

This is currently set up for tools like LM Studio or another local server exposing the same API shape.

Before using `AiAgent`, make sure:

- a local model server is running on port `1234`
- the selected model name in `AiService` exists in that server

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
    AiAgent,
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
    AiAgent,
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
    AiAgent,
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

If your agent needs Angular services, follow the `AiAgent` pattern and pass `Injector` into the constructor.

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
main.js         Electron main process and SQLite logic
preload.js      Electron preload bridge
```

## Summary

This project is a local desktop chat app where each conversation is powered by an agent. Angular handles the UI, Electron provides the desktop shell, SQLite stores the data, and agents define the conversation behavior. If you want to extend the app, the main entry point is usually creating a new `Agent` class and wiring it into chat creation.
