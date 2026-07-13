# Testing

The repository has two test environments:

- Angular unit and component tests under `src/**/*.spec.ts`;
- Node-based Electron and integration tests under `tests/electron/**/*.spec.ts`.

Run both when changing a contract shared across renderer and main-process code.

# Commands

Run Angular tests once:

```powershell
npm test -- --watch=false
```

Run Electron-side Vitest suites:

```powershell
npm run test:electron
```

Build both Angular and Electron TypeScript:

```powershell
npm run build
```

On Windows automation, invoke `npm.cmd` instead of `npm` when the shell does not resolve npm's PowerShell shim correctly.

# Angular test environment

Angular's unit-test builder loads `src/test-setup.ts`. It currently installs an `IntersectionObserver` mock required by UI dependencies.

Standalone components are tested through `TestBed`:

```ts
await TestBed.configureTestingModule({
  imports: [ChatComponent],
  providers: [
    provideHttpClient(),
    provideMarkdown({
      sanitize: {
        provide: SANITIZE,
        useValue: sanitizeMarkdown,
      },
    }),
  ],
}).compileComponents();
```

Provide the same framework services or tokens used by the component. For app-level tests, provide `REGISTERED_AGENTS` and the `CHAT_PROVIDER` multi token explicitly.

# Creating chats in tests

Use the shared manager stub when persistence behavior is not under test:

```ts
const supporter = new Supporter('supporter-id');
const chat = new Chat(
  'chat-id',
  'Test chat',
  supporter,
  createChatManagerStub(),
);
```

`createChatManagerStub()` accepts sends, edits, deletes, and property changes locally. It keeps component and domain tests focused without constructing a real provider.

Set component inputs before detecting changes:

```ts
fixture.componentRef.setInput('chat', chat);
fixture.detectChanges();
await fixture.whenStable();
```

# Testing agents

An agent test should verify observable conversation behavior rather than private fields:

1. Configure `REGISTERED_AGENTS` and `AgentsService` in `TestBed`.
2. Construct a chat with `createChatManagerStub()`.
3. Assign the agent through `supporter.setAgent(agent, isNewChat)`.
4. Send input through `chat.user.ask(...)` or `chat.user.answer(...)`.
5. Assert message types, values, tags, statuses, and supporter context.
6. Call `agent.onDestroy()` or switch agents during cleanup.

When the client starts an agent response without awaiting its completion, use `vi.waitFor(...)` or await the agent operation through a controlled test seam before asserting the final supporter message.

# Testing validators and questions

Validator tests can call the pure helpers directly:

```ts
expect(
  evaluateValidator('1234', {
    type: 'regex',
    pattern: '^\\d+$',
  }).isValid,
).toBe(true);
```

Also test persistence normalization and malformed specs. The existing validator suite demonstrates `normalizeValidatorSpec(...)`, `coerceValidatorSpec(...)`, and composed rules.

Question tests should use `Question.isAnswerValid(new Answer(value))`, including multiple-selection behavior when relevant.

# Testing message sources

Create a small source subclass whose `getMessages(start, end)` records offsets and returns deterministic chunks. Verify:

- the default or configured chunk size;
- older chunks are prepended in chronological order;
- a short chunk marks the source exhausted;
- the loader advances to the next source only after exhaustion;
- concurrent `loadNextChunk()` calls share one promise;
- rejected loads can be retried.

Connect hydrated messages to the test chat if edit or delete behavior is part of the assertion.

# Testing managers and providers

For a manager, use a provider spy and assert status translation:

- successful provider calls return `Sent` or `Read`;
- rejected calls return `Failed`;
- deletion does not remove local state on failure;
- a delete waits for any pending create when the backend can race.

For a provider, verify the full hydration contract:

- concrete message subclasses are restored;
- dates and validators are normalized;
- save handlers are installed;
- sources are registered in order;
- the initial chunk loads before agent initialization;
- new and restored chats receive the correct `isNewChat` value.

# Electron tests

Electron tests run in a Node environment configured by `vitest.electron.config.ts`. They mock Electron and PowerSync dependencies before importing modules that create process-level singletons.

Use `vi.hoisted(...)` for mock state that must exist before module evaluation, and call `vi.clearAllMocks()` in `beforeEach` when call history must not leak between cases.

Existing suites cover:

- local database and sync lifecycle;
- authentication state transitions;
- PowerSync upload outcomes;
- production sync and backend contracts;
- connector and server-authentication behavior.

# Contract tests

When documentation states a production invariant used by CI, add a contract test. `production-contracts.spec.ts` currently checks that the PowerSync configuration is user-scoped and that the backend contract documents atomicity, idempotency, ownership, cascade integrity, and rejection behavior.

Contract tests should assert meaningful required phrases or parsed configuration, not formatting that can change without altering the contract.
