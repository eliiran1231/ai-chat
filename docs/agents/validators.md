# What is a validator?

A validator is a serializable rule attached to a `Question`. When the client replies with an `Answer`, the base agent checks the answer against that rule before continuing the conversation.

If no validator is configured, every value is valid. If validation fails, `Agent.onInvalidAnswer(...)` sends the question's `validationErrorMessage` and stops the current response by default.

# Creating a validator

Pass a validator and an optional error message to the `Question` constructor:

```ts
const question = new Question('What is your age?', {
  validator: {
    type: 'regex',
    pattern: '^(120|1[0-1][0-9]|[1-9]?[0-9])$',
  },
  validationErrorMessage: 'Please enter an age from 0 to 120.',
});
```

Regular expressions can also be passed directly. They are normalized to a serializable `regex` validator:

```ts
const question = new Question('Enter your name');
question.setValidator(
  /^[a-z]+$/i,
  'Your name should contain letters only.',
);
```

Use object-based `ValidatorSpec` values when rules need to be persisted or composed. Invalid or unknown persisted validator objects are ignored with a console warning rather than executed.

# Validator properties

Validation-related state belongs to the question:

| Property | Type | Meaning |
| --- | --- | --- |
| `validatorSpec` | `SyncedSignal<ValidatorSpec \| undefined>` | The normalized, serializable validation rule. Read it with `question.validatorSpec()`. |
| `validationErrorMessage` | `Message` | The message sent by the default invalid-answer handler. Its default text is `Invalid answer. Please try again.` |

The common validator property is `type`. Each type has additional properties described below. `Question.isAnswerValid(answer)` evaluates the current rule. The lower-level `validateValue(value, spec)` helper returns a boolean, while `evaluateValidator(value, spec)` returns `{ isValid: boolean }`.

For a multiple-selection question, every comma-separated selected value must pass the same validator, and the answer must contain at least one value.

# Validator types

## `required`

Accepts a value containing at least one non-whitespace character.

```ts
{ type: 'required' }
```

## `regex`

Tests the value with a JavaScript regular expression. `pattern` is required and `flags` is optional.

```ts
{
  type: 'regex',
  pattern: '^[a-z]+$',
  flags: 'i',
}
```

The pattern must be valid. Validation uses `RegExp.test` against the complete input you provide, so add `^` and `$` when the entire answer must match.

## `length`

Checks the string length. At least one of `min` or `max` is required, both must be finite numbers, and `min` cannot be greater than `max`.

```ts
{ type: 'length', min: 3, max: 50 }
```

## `oneOf`

Accepts an exact value from the supplied string array. Matching is case-sensitive.

```ts
{
  type: 'oneOf',
  values: ['billing', 'technical issue', 'account'],
}
```

This is commonly paired with `possibleAnswers` generated from the same array.

## `and`

Accepts the value only when every nested rule passes. `rules` must be a non-empty array of valid validator specifications.

```ts
{
  type: 'and',
  rules: [
    { type: 'required' },
    { type: 'length', min: 3, max: 30 },
    { type: 'regex', pattern: '^[a-z ]+$', flags: 'i' },
  ],
}
```

## `or`

Accepts the value when at least one nested rule passes. `rules` must be a non-empty array of valid validator specifications.

```ts
{
  type: 'or',
  rules: [
    { type: 'oneOf', values: ['skip'] },
    { type: 'regex', pattern: '^\\d+$' },
  ],
}
```

## Validation and possible answers

Validators and possible answers solve different problems:

- `possibleAnswers` controls which choices the UI offers.
- `validator` controls which submitted values the conversation accepts.

For constrained choices, configure both. For suggestions that should still allow free text, configure possible answers without a `oneOf` validator, or use an `or` validator that also accepts the desired free-text format.
