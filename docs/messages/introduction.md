# Messages, questions, and answers

Messages are the units stored in `chat.messages`. The framework uses three concrete classes:

| Class | Purpose |
| --- | --- |
| `Message` | Normal text, Markdown, or attachment-bearing content. |
| `Question` | A message that may define validation, possible answers, and a selection mode. |
| `Answer` | A client or supporter response. It currently adds no fields beyond `Message`, but its type is used by agents, providers, and validation. |

Providers must preserve the concrete type during persistence and hydration. Restoring every record as `Message` would lose question controls and answer-specific flow behavior.

## Creating messages

Construct a normal message from a value and optional metadata:

```ts
const message = new Message('Your request has been received.', {
  tag: 'confirmation',
  editable: false,
  deletable: true,
});
```

Create questions and answers with their concrete classes:

```ts
const question = new Question('Choose a priority.', {
  tag: 'priority',
  possibleAnswers: ['low', 'normal', 'urgent'],
  validator: {
    type: 'oneOf',
    values: ['low', 'normal', 'urgent'],
  },
});

const answer = new Answer('urgent', { tag: 'priority-answer' });
```

Use `Client` or `Supporter` methods to send these objects. They set the sender, attach the chat, append the message, and route persistence through the chat manager.

## Message options

`MessageOptions` supports:

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `Uuid` | `crypto.randomUUID()` | Stable identity used for rendering and persistence. |
| `tag` | `string` | `general` | Application-defined flow or lookup label. |
| `attachment` | `Attachment` | `undefined` | File metadata and processed URL. |
| `editable` | `boolean` | `true` | Whether the UI may request an edit. |
| `deletable` | `boolean` | `true` | Whether deletion is permitted. |
| `time` | `Date` | Current time | Original creation time. |
| `from` | `client \| supporter` | `undefined` | Sender; participant APIs normally assign it. |
| `status` | `MessageStatus` | `Failed` | Current delivery state; the manager changes it when sending. |
| `editedAt` | `Date` | `undefined` | Time of the latest successful edit. |

`QuestionOptions` extends these fields with `validator`, `validationErrorMessage`, `possibleAnswers`, and `answerSelectionMode`.

## Message properties

Except for `id`, message properties are `SyncedSignal` values. Read them as functions:

```ts
message.value();
message.status();
message.from();
message.attachment();
```

Update them with `set(...)` or `update(...)` only when you intentionally want to change the model. User actions should prefer `edit()`, `delete()`, and participant APIs because those methods preserve manager and event behavior.

## Tags

Tags are stable application-defined labels. Agents commonly use them to identify which question was answered:

```ts
if (this.lastQuestion?.tag() === 'priority') {
  // Continue the priority branch.
}
```

Tags are not required to be unique. If a flow uses them as state identifiers, establish and document a naming convention within that agent.

## Markdown rendering

The chat bubble renders message values with `ngx-markdown`. Both client and supporter messages support Markdown. The application sanitizes rendered Markdown through its configured `sanitizeMarkdown` function; do not bypass that pipeline when displaying provider or agent output.

## Questions and answers

A `Question` can validate typed input and offer UI selections. These are separate concerns: possible answers control the UI, while the validator controls acceptance.

See:

- [Possible answers](../agents/possible-answers.md)
- [Validators](../agents/validators.md)
- [Message lifecycle](lifecycle.md)
