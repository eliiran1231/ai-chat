# Possible answers

Possible answers are predefined choices attached to a `Question`. The chat UI renders them as selectable options, allowing the client to answer without typing free text.

Possible answers improve the input experience, but they do not validate an answer by themselves. Add a matching validator when the response must be limited to the displayed choices.

## Creating possible answers

Pass strings in the question constructor:

```ts
const topics = ['billing', 'technical issue', 'account', 'other'];

const question = new Question('What do you need help with?', {
  possibleAnswers: topics,
  validator: {
    type: 'oneOf',
    values: topics,
  },
  validationErrorMessage: 'Please choose one of the available topics.',
});

this.supporter.ask(question);
```

Strings are converted to `Answer` instances automatically. You can instead pass `Answer[]` when an option needs message metadata:

```ts
question.setPossibleAnswers([
  new Answer('Standard'),
  new Answer('Urgent'),
]);
```

`setPossibleAnswers(...)` replaces the complete list. Passing an empty array removes the choices.

## Single selection

`single` is the default `answerSelectionMode`:

```ts
new Question('Choose a priority', {
  possibleAnswers: ['low', 'normal', 'urgent'],
  answerSelectionMode: 'single',
});
```

Selecting an option submits one `Answer`. Fewer than 10 choices are displayed inline. A list of 10 or more opens in the answer sheet, and search is available when the list has at least 15 choices.

## Multiple selection

Use `multiple` when the client may select more than one option:

```ts
const channels = ['chat', 'email', 'phone'];

new Question('How should we contact you?', {
  possibleAnswers: channels,
  answerSelectionMode: 'multiple',
  validator: {
    type: 'oneOf',
    values: channels,
  },
});
```

Multiple selections are joined into a comma-separated client answer. During validation, the question splits that value and validates every selected item independently. At least one item must be selected.

## Changing an earlier selection

The base agent tracks which question produced a selected answer. Selecting a different option for the latest question submits a new client answer. Changing an older selection edits the first client `Answer` after that question; the normal edit flow then deletes later messages and asks the agent to rebuild the conversation.

## Important behavior

- `possibleAnswers` is stored as a synced signal, so read it with `question.possibleAnswers()`.
- `answerSelectionMode` is also a synced signal and is read with `question.answerSelectionMode()`.
- Possible answers are exact values. The `oneOf` validator is case-sensitive.
- A client can still type an answer. Use `validator` to decide whether typed input is accepted.
- Keep `possibleAnswers` and a corresponding `oneOf.values` list derived from the same array so the UI and validation rules cannot drift apart.
