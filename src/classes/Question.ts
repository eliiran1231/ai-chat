import { ValidatorSpec } from "../interfaces/validation/ValidatorSpec";
import { syncedSignal, SyncedSignal } from "../signals/syncedSignal";
import { Answer } from "./Answer";
import { MessageOptions, Message } from "./Message";
import { coerceValidatorSpec, normalizeValidatorSpec, validateValue } from "./MessageValidator";


export function getPersistableValidationErrorMessage(
    validationErrorMessage: string | Message,
): string | undefined {
    if (typeof validationErrorMessage === 'string') {
        return validationErrorMessage;
    }

    return typeof validationErrorMessage.value === 'string'
        ? validationErrorMessage.value
        : undefined;
}

export type QuestionOptions = MessageOptions & {
    validator?: RegExp | ValidatorSpec;
    validationErrorMessage?: string | Message;
    possibleAnswers?: string[] | Answer[];
    answerSelectionMode?: AnswerSelectionMode;
}

export type AnswerSelectionMode = 'single' | 'multiple';

export class Question extends Message {
    public possibleAnswers: SyncedSignal<Answer[]> = syncedSignal([]);
    public validatorSpec?: SyncedSignal<ValidatorSpec>;
    public validationErrorMessage: Message  = new Message("Invalid answer. Please try again.");
    public answerSelectionMode: SyncedSignal<AnswerSelectionMode> = syncedSignal('single');

    constructor(value: string, options?: QuestionOptions) {
        super(value, options);
        if (options?.validator) {
            this.setValidator(options.validator, options.validationErrorMessage);
        }
        if (options?.possibleAnswers) {
            this.setPossibleAnswers(options.possibleAnswers);
        }
        if (options?.answerSelectionMode) {
            this.answerSelectionMode.set(options.answerSelectionMode);
        }
    }

    setValidator(validator: RegExp | ValidatorSpec, validationErrorMessage?: string | Message) {
        const spec = coerceValidatorSpec(normalizeValidatorSpec(validator))
        spec && this.validatorSpec?.set(spec);
        if(typeof validationErrorMessage === 'string') {
            this.validationErrorMessage.value.set(validationErrorMessage);
        }
        else this.validationErrorMessage.value.set(validationErrorMessage?.value() ?? "Invalid answer. Please try again.");
    }

    setPossibleAnswers(answers: string[] | Answer[]) {
        this.possibleAnswers.set(this.normalizeAnswers(answers));
    }

    private normalizeAnswers(answers: string[] | Answer[]) {
        if (!answers.length) return [];
        return typeof answers[0] === 'string'
            ? answers.map(answer => new Answer(answer as string))
            : answers as Answer[];
    }
    
    isAnswerValid(answer: Answer) {
        if (this.answerSelectionMode() === 'multiple') {
            const answerValues = answer.value()
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
            return !!answerValues.length &&
                answerValues.every(value => validateValue(value, this.validatorSpec?.()));
        }

        return validateValue(answer.value(), this.validatorSpec?.());
    }

    override clone(): Question {
        return new Question(this.value(), {
            id: this.id(),
            tag: this.tag(),
            attachment: this.attachment(),
            editable: this.editable(),
            deletable: this.deletable(),
            time: this.time(),
            from: this.from(),
            status: this.status(),
            editedAt: this.editedAt(),
            validator: this.validatorSpec?.(),
            validationErrorMessage: this.validationErrorMessage,
            possibleAnswers: this.possibleAnswers(),
            answerSelectionMode: this.answerSelectionMode(),
        })
    }
}
