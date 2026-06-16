import { ValidatorSpec } from "../interfaces/validation/ValidatorSpec";
import { Answer } from "./Answer";
import { MessageOptions, Message } from "./Message";
import { coerceValidatorSpec, normalizeValidatorSpec, validateValue } from "./MessageValidator";
import { dbProperty } from "./DBEntity";


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
    @dbProperty
    public possibleAnswers: Answer[] = [];
    @dbProperty
    public answerSelectionMode: AnswerSelectionMode = 'single';
    @dbProperty
    public validatorSpec?: ValidatorSpec;
    @dbProperty
    public validationErrorMessage: string | Message  = "Invalid answer. Please try again.";

    constructor(value: string, options?: QuestionOptions) {
        super(value, options);
        if (options?.validator) {
            this.setValidator(options.validator, options.validationErrorMessage);
        }
        if (options?.possibleAnswers) {
            this.setPossibleAnswers(options.possibleAnswers);
        }
        if (options?.answerSelectionMode) {
            this.answerSelectionMode = options.answerSelectionMode;
        }
        this.enableDbChanges();
    }

    setValidator(validator: RegExp | ValidatorSpec, validationErrorMessage?: string | Message) {
        this.validatorSpec = coerceValidatorSpec(normalizeValidatorSpec(validator));
        if(validationErrorMessage) this.validationErrorMessage = validationErrorMessage;
    }

    setPossibleAnswers(answers: string[] | Answer[]) {
        this.possibleAnswers = this.normalizeAnswers(answers);
    }

    private normalizeAnswers(answers: string[] | Answer[]) {
        if (!answers.length) return [];
        return typeof answers[0] === 'string'
            ? answers.map(answer => new Answer(answer as string))
            : answers as Answer[];
    }
    
    isAnswerValid(answer: Answer) {
        if (this.answerSelectionMode === 'multiple') {
            const answerValues = answer.value
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
            return !!answerValues.length &&
                answerValues.every(value => validateValue(value, this.validatorSpec));
        }

        return validateValue(answer.value, this.validatorSpec);
    }

    override clone(): Question {
        return new Question(this.value, { ...this })
    }
}
