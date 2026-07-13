# What is an agent?

An agent contains the conversation logic used by a supporter. It decides what the supporter sends when a chat starts and how the supporter reacts to each client message.

Every agent extends the base `Agent` class. The base class connects the agent to a `Chat` and a `Supporter`, tracks the latest message and question, validates answers, and subscribes to message edit, deletion, and answer-selection events. A concrete agent adds the behavior for a particular conversation flow.

Agents should use the supporter API to add messages:

- `supporter.sendMessage(...)` sends a normal message.
- `supporter.ask(...)` sends a `Question` and records it as `lastQuestion`.
- `supporter.answer(...)` sends an `Answer`.
- `supporter.setAgent(...)` switches the chat to another agent.

Do not push messages directly into `chat.messages`. The supporter methods assign the sender, persist the message, update its status, and notify the rest of the application.

# Creating an agent

Create a class that extends `Agent`, inject Angular's `Injector`, and pass it to `super`:

```ts
import { Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Question } from '../../classes/Question';
import { Supporter } from '../../classes/Supporter';

export class GreetingAgent extends Agent {
  constructor(injector: Injector) {
    super(injector);
  }

  override init(chat: Chat, supporter: Supporter, isNewChat = false): void {
    super.init(chat, supporter, isNewChat);
  }

  override async respond(edited = false): Promise<void> {
    await super.respond(edited);
  }
}
```

Calling the base implementations is important. `super.init(...)` connects the agent and installs its event subscriptions. `super.respond(...)` records the last client message, marks it as read, and runs validation against the last question.

Register the agent under a stable name in `AppAgentsModule`:

```ts
import { GreetingAgent } from '../agents/GreetingAgent/GreetingAgent';

@AgentsModule({
  agents: {
    GreetingAgent,
  },
})
export class AppAgentsModule {}
```

The registration key is the persisted agent name. The application provides this catalog with `provideAgents(AppAgentsModule)`, and `AgentsService.getAgentByName('GreetingAgent')` creates an instance.

# Agent properties

The base `Agent` exposes these properties to subclasses:

| Property | Type | Meaning |
| --- | --- | --- |
| `chat` | `Chat` | The current chat. It is assigned by `init`. |
| `supporter` | `Supporter` | The supporter controlled by the agent. It is assigned by `init`. |
| `lastQuestion` | `Question \| undefined` | The latest question sent by the supporter. Existing chat messages are inspected when the agent initializes. |
| `lastMessage` | `Message \| undefined` | The client message currently being handled. It is updated by `respond`. |
| `name` | `string` | The registered name of the agent. It is resolved from `AgentsService` and cannot be changed after being set. |

These properties are not ready before `super.init(...)` runs. Keep flow-specific state on the subclass, or use `supporter.setContext(...)` when that state must survive persistence and agent re-creation.

# Simple agent implementation

This agent greets a new chat and responds only to a small set of basic greetings:

```ts
import { Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Question } from '../../classes/Question';
import { Supporter } from '../../classes/Supporter';

export class GreetingAgent extends Agent {
  private readonly greetings = ['hi', 'hello', 'hey'];

  constructor(injector: Injector) {
    super(injector);
  }

  override init(chat: Chat, supporter: Supporter, isNewChat = false): void {
    super.init(chat, supporter, isNewChat);

    if (isNewChat) {
      this.supporter.ask(
        new Question('Hello! Say hi to get started.', {
          validator: {
            type: 'oneOf',
            values: this.greetings,
          },
          validationErrorMessage: 'Please reply with hi, hello, or hey.',
          possibleAnswers: this.greetings,
          tag: 'greeting',
        }),
      );
    }
  }

  override async respond(edited = false): Promise<void> {
    await super.respond(edited);

    if (this.lastQuestion?.tag() === 'greeting') {
      await this.supporter.sendMessage('Hi! How can I help you today?');
    }
  }
}
```

The `oneOf` validator is case-sensitive, so this exact example accepts the lowercase values shown in `greetings`. The possible-answer buttons submit those same values. If free text such as `Hello` should also work, use a case-insensitive regular expression or normalize the input in custom flow logic.
