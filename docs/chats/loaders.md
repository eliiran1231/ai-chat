# What is a message loader?

`MessageLoader` coordinates lazy loading of older chat history. Every `Chat` creates one loader and exposes it as `chat.loader`.

The loader does not fetch or hydrate messages itself. It owns an ordered list of `MessageSource` instances and asks the active source for its next chunk. A source owns the pagination details for one backend or history segment.

# What is a message source?

`MessageSource` is the abstract base class for a paginated history source. It tracks:

- the current zero-based `start` offset;
- a chunk size, which defaults to 20;
- whether the source has been exhausted;
- the chat that receives the loaded messages.

A subclass implements only this method:

```ts
protected abstract getMessages(
  start: number,
  end: number,
): Message[] | Promise<Message[]>;
```

`start` is inclusive and `end` is exclusive. A source should return at most `end - start` messages.

# Creating a message source

This in-memory source treats the end of the array as the newest history and returns every chunk in chronological display order:

```ts
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { MessageSource } from '../../classes/MessageSource';

export class InMemoryMessagesSource extends MessageSource {
  constructor(chat: Chat, private readonly history: Message[]) {
    super(chat);
  }

  protected override getMessages(start: number, end: number): Message[] {
    const page = this.history
      .slice()
      .reverse()
      .slice(start, end)
      .reverse();

    for (const message of page) {
      message.setChat(this.chat);
    }

    return page;
  }
}
```

The first call must load the newest available history chunk, the next call must load the chunk immediately before it, and each returned chunk must be ordered from oldest to newest. `MessageSource.loadChunk()` prepends the result to `chat.messages`, so returning newest-first data would reverse the visible conversation order.

If hydrated messages can be edited, deleted, or synchronized, the source must also connect their persistence handlers before returning them. `SqliteMessagesSource` is the repository example: it reads records through `DbService`, restores `Message`, `Answer`, and `Question` subclasses, connects them to the chat, and installs the provider's save handler.

# Configuring chunk size

Use `setChunkSize(...)` before loading:

```ts
const source = new InMemoryMessagesSource(chat, history);
source.setChunkSize(50);
chat.loader.addSource(source);
```

The size must be greater than zero. A source becomes exhausted when a request returns fewer messages than its configured chunk size. If the final page contains exactly one full chunk, the source is marked exhausted by the following empty request.

# Adding and chaining sources

Sources are processed in the order they are added:

```ts
chat.loader.addSource(new SqliteMessagesSource(chat, db, saveMessage));
chat.loader.addSource(new ArchivedMessagesSource(chat, archiveClient));
```

The loader keeps using the first source until it is exhausted. Only then does it advance to the next source. This makes it possible to join multiple histories—for example, current database messages followed by an older imported conversation—without loading the sources in parallel.

One call returns the first non-empty chunk produced by the active chain. When an exhausted source returns no messages, the loader can advance to the next source during that same call. When a source returns a non-empty final partial chunk, that chunk is returned first and the next source begins on the following call.

Adding another source later is supported. If all previous sources are already exhausted, the next call continues from the newly appended source.

# Loading the next chunk

Call the loader through the chat:

```ts
const olderMessages = await chat.loader.loadNextChunk();

if (olderMessages.length === 0) {
  // Every currently registered source is exhausted.
}
```

The returned array contains the messages loaded by that call. The source has already prepended them to `chat.messages`.

`MessageLoader` deduplicates overlapping requests. If `loadNextChunk()` is called again while a load is in progress, both callers receive the same promise rather than advancing pagination twice. Errors are allowed to reject the promise, and the in-flight state is cleared in `finally` so a later call can retry.

# Loading on scroll

`ChatComponent` calls `chat.loader.loadNextChunk()` when the scrollbar reaches the top. It records the previous content height and scroll position, then offsets the scroll position by the height of the prepended messages. This keeps the same message in view instead of jumping the user to the beginning of the newly loaded chunk.

# Provider integration

A provider should add sources while hydrating a chat and usually load the first chunk before returning it:

```ts
chat.loader.addSource(
  new SqliteMessagesSource(
    chat,
    this.dbService,
    this.commitMessageChanges.bind(this),
  ),
);

await chat.loader.loadNextChunk();
```

Load initial history before initializing the restored agent. That allows `Agent.init(...)` to recover its latest supporter question from the hydrated messages. Pass an explicit `isNewChat` flag to the agent; do not infer creation state from `chat.messages().length`, because history hydration is asynchronous.
