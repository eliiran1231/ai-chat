# Getting started

AI Chat is an Angular and Electron chat framework. Chats can use scripted agents, XState flows, or an AI-backed agent, while providers decide how chats are authenticated, persisted, and synchronized.

## Prerequisites

Install:

- Node.js with npm;
- a Windows desktop environment for the current Electron setup;
- native build tools supported by Electron when `better-sqlite3` needs rebuilding.

The project declares npm 11 in `package.json`. A PowerSync backend is optional for local-only work, but it is required to exercise remote authentication and synchronization.

## Install and run

Install dependencies:

```powershell
npm install
```

The `postinstall` script rebuilds `better-sqlite3` for the installed Electron version.

Build the Angular renderer and Electron process, then launch the desktop app:

```powershell
npm start
```

Other useful commands are:

```powershell
npm run build
npm run dev
npm run watch
npm test -- --watch=false
npm run test:electron
```

`npm run watch` rebuilds the Angular renderer but does not restart Electron automatically.

## Understand the default application

The application currently registers three agents:

- `AiAgent` sends messages to a local OpenAI-compatible endpoint;
- `MockAgent` demonstrates a scripted questionnaire;
- `FlowAgent` demonstrates an XState-driven conversation.

It registers one chat provider, `SqliteProvider`, whose UI is presented as the PowerSync integration. Local database operations remain available without a remote session; authentication enables backend synchronization.

## Create your first agent

Create `src/agents/HelloAgent/HelloAgent.ts`:

```ts
import { Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Question } from '../../classes/Question';
import { Supporter } from '../../classes/Supporter';

export class HelloAgent extends Agent {
  private readonly greetings = ['hi', 'hello', 'hey'];

  constructor(injector: Injector) {
    super(injector);
  }

  override async init(
    chat: Chat,
    supporter: Supporter,
    isNewChat = false,
  ): Promise<void> {
    await super.init(chat, supporter, isNewChat);

    if (isNewChat) {
      await supporter.ask(
        new Question('Say hello to begin.', {
          possibleAnswers: this.greetings,
          validator: { type: 'oneOf', values: this.greetings },
          validationErrorMessage: 'Choose hi, hello, or hey.',
          tag: 'greeting',
        }),
      );
    }
  }

  override async respond(edited = false): Promise<void> {
    await super.respond(edited);

    if (this.lastQuestion?.tag() === 'greeting') {
      await this.supporter.sendMessage('Hello! Your agent is working.');
    }
  }
}
```

Always call `super.init(...)` and `super.respond(...)`. The base methods establish subscriptions, restore the latest question, record the incoming message, update its status, and run validation.

## Register the agent

Add the class to `AppAgentsModule`:

```ts
import { HelloAgent } from '../agents/HelloAgent/HelloAgent';

@AgentsModule({
  agents: {
    AiAgent,
    FlowAgent,
    HelloAgent,
    MockAgent,
  },
})
export class AppAgentsModule {}
```

The registration key is persisted as the agent name. Treat it as a stable identifier.

## Create a chat with the agent

Resolve the registered agent and pass it to `ChatService`:

```ts
import { inject } from '@angular/core';
import { AgentsService } from './services/agents.service';
import { ChatService } from './services/chat.service';

const agents = inject(AgentsService);
const chats = inject(ChatService);

const agent = agents.getAgentByName('HelloAgent');
const chat = await chats.createChat(agent);
```

`ChatService` uses the default provider when no provider is supplied. A provider creates the persisted chat and supporter, hydrates history, connects a manager, and initializes the agent with explicit new-chat intent.

## Where to go next

- Learn the complete lifecycle in [Agent functions](agents/functions.md).
- Add typed choices with [Possible answers](agents/possible%20answers.md).
- Constrain input with [Validators](agents/validators.md).
- Understand persistence in [Signals and persistence](state/signals.md).
- Add a backend using [Chat providers](chats/providers.md).
- Write tests using [Testing](testing.md).

## Optional local AI endpoint

`AiAgent` uses `AiService`, which currently posts to:

```text
http://localhost:1234/v1/chat/completions
```

Start LM Studio or another OpenAI-compatible server on that address and make sure the configured model, `google/gemma-3-4b`, exists. Scripted and flow agents do not require this server.
