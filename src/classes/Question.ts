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
}

export class Question extends Message {
    public possibleAnswers: SyncedSignal<Answer[]> = syncedSignal([]);
    public validatorSpec?: SyncedSignal<ValidatorSpec>;
    public validationErrorMessage: Message  = new Message("Invalid answer. Please try again.");

    constructor(value: string, options?: QuestionOptions) {
        super(value, options);
        if (options?.validator) {
            this.setValidator(options.validator, options.validationErrorMessage);
        }
        if (options?.possibleAnswers) {
            this.setPossibleAnswers(options.possibleAnswers);
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
        if (answers.length === 0) {
            this.possibleAnswers.set([]);
        }
        else if(typeof answers[0] === 'string') 
            this.possibleAnswers.set(answers.map(answer => new Answer(answer as string)));
        else 
            this.possibleAnswers.set(answers as Answer[]);
    }
    
    isAnswerValid(answer: Answer) {
        const spec = this.validatorSpec?.();
        return validateValue(answer.value(), spec);
    }
}
