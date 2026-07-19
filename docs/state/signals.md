# Signals and persistence

The framework uses Angular signals for both local state and persistable domain state. Choosing the correct signal type determines whether a change stays in memory or is offered to a provider for saving.

## State categories

| State type | Use it for | Examples |
| --- | --- | --- |
| `signal(...)` | Ephemeral UI or runtime state | Active chat, draft text, loading flags, cached actions |
| `computed(...)` | Values derived from other signals | `chat.isRead`, authentication login state |
| `syncedSignal(...)` | Model state whose changes should trigger a save handler | Chat name, message value, supporter name |
| Supporter context | Persisted flow or agent state that is replaced as a unit | XState snapshot, workflow progress |

Do not use `syncedSignal` simply because a value is visible in the UI. Use it only when the provider must observe and persist changes.

## Synced signals

`SyncedSignal<T>` extends Angular's `WritableSignal<T>` and adds synchronization-aware `set`, `update`, and `sync` methods:

```ts
const status = syncedSignal('open');

status();
status.set('closed');
status.update(current => `${current}-archived`);
```

Like all Angular signals, it is read by calling it as a function.

### Debounced writes

Each change schedules its owning entity's save handler after 500 milliseconds. A second change to the same signal within that period replaces the pending task.

Debouncing is per signal, not per entity. Updating `chat.name` and `chat.subtitle` schedules two handler calls because they are different signals.

The handler receives:

```ts
(target, propertyName, newValue) => void | Promise<void>
```

Providers may ignore the property arguments and persist a complete entity snapshot, which is what the current SQLite provider does.

### UI-only writes

`set` and `update` accept a second `uiOnly` argument:

```ts
message.status.set(MessageStatus.Pending, true);
```

When `uiOnly` is `true`, the local signal changes without scheduling its save handler. This is useful for temporary presentation state during an operation.

Use it narrowly. A UI-only write is not automatically persisted by a later unrelated operation unless that provider saves the complete entity at that point.

## Synced entities

Classes containing synced signals extend `SyncedEntity`:

```ts
export class Ticket extends SyncedEntity {
  readonly title = syncedSignal('Untitled');
  readonly resolved = syncedSignal(false);

  constructor() {
    super();
    this.initSync();
  }
}
```

`initSync()` finds the synced signals currently assigned to the object and attaches their parent entity and property names. Call it only after all constructor-created synced fields are assigned.

If a subclass adds synced properties after a base constructor has already initialized synchronization, it must ensure those new properties are also initialized. Prefer declaring the full synced shape in one owner when possible.

## Installing a save handler

New entities start with a no-op handler. A provider installs persistence after constructing or hydrating the object:

```ts
chat.setSaveChangesHandler((target, property, value) => {
  return this.commitChatChanges(target as Chat);
});
```

The framework's `SqliteProvider` installs separate handlers for chats, supporters, and messages. Hydrated messages receive handlers from `SqliteMessagesSource`.

The handler is the persistence boundary. A synced signal does not know which database or API owns it.

## Saving an entire entity

Call `saveChanges()` when state outside a synced property has changed but should use the same handler:

```ts
await supporter.setContext(nextContext);
```

`Supporter.setContext(...)` replaces its private context value, calls `saveChanges()`, and then emits `onContextChange`. `saveChanges()` invokes the handler with the property marker `all`.

## Hydration

Hydration should establish initial values without writing them back as new mutations:

1. Construct the entity from persisted values.
2. Connect collaborating objects such as the chat and manager.
3. Install the save handler.
4. Expose the entity to application code.

Constructor assignments happen before a provider installs its save handler, so restoring an object does not create an immediate backend write.

For messages, hydration must also restore the concrete `Message`, `Question`, or `Answer` type and call `message.setChat(chat)`.

## Updating values safely

Use `set` or `update`; mutating a nested object in place does not notify the signal:

```ts
// Correct: replace the object.
chat.avatar.set({ ...chat.avatar(), value: 'AI' });

// Incorrect: no signal update is emitted.
chat.avatar().value = 'AI';
```

Persistable values should also be serializable. Validators are stored as object specifications instead of raw `RegExp` instances for this reason.

## Ephemeral state

Keep operation progress, component selection, temporary streams, and other reconstructable state in ordinary signals:

```ts
readonly isLoading = signal(false);
```

Persist only state needed to reconstruct the domain after reload. This keeps provider payloads stable and prevents transient UI behavior from leaking into chat or supporter records.

## Manager property changes

`ChatManager.requestPropChange(...)` offers a manager-mediated property-change path, but synced signals do not call it automatically. A provider can install a save handler that delegates to that method, or install direct entity persistence as `SqliteProvider` does.

Use one clear route per entity type so the same change is not written twice.
