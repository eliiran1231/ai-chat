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
    answerOptions?: AnswerOptionsInput;
}

export type AnswerSelectionMode = 'single' | 'multiple';

export type AnswerOptions = {
    possibleAnswers: Answer[];
    selectionMode: AnswerSelectionMode;
    sheetTitle?: string;
    minNumberToShowInSheet: number;
};

export type PersistedAnswerOptions = Omit<AnswerOptions, 'possibleAnswers'>;

export type AnswerOptionsInput = {
    possibleAnswers: Answer[];
    selectionMode?: AnswerSelectionMode;
    sheetTitle?: string;
    minNumberToShowInSheet?: number;
};

export const DEFAULT_MIN_NUMBER_TO_SHOW_IN_SHEET = 10;

export class Question extends Message {
    @dbProperty
    public answerOptions?: AnswerOptions;
    @dbProperty
    public validatorSpec?: ValidatorSpec;
    @dbProperty
    public validationErrorMessage: string | Message  = "Invalid answer. Please try again.";
    public get possibleAnswers() {
        return this.answerOptions?.possibleAnswers ?? [];
    }

    constructor(value: string, options?: QuestionOptions) {
        super(value, options);
        if (options?.validator) {
            this.setValidator(options.validator, options.validationErrorMessage);
        }
        if (options?.answerOptions) {
            this.setAnswerOptions(options.answerOptions);
        }
        else if (options?.possibleAnswers) {
            this.setAnswerOptions({
                possibleAnswers: this.normalizeAnswers(options.possibleAnswers),
                selectionMode: 'single',
            });
        }
        this.enableDbChanges();
    }

    setValidator(validator: RegExp | ValidatorSpec, validationErrorMessage?: string | Message) {
        this.validatorSpec = coerceValidatorSpec(normalizeValidatorSpec(validator));
        if(validationErrorMessage) this.validationErrorMessage = validationErrorMessage;
    }

    setAnswerOptions(options: AnswerOptionsInput) {
        this.answerOptions = {
            possibleAnswers: options.possibleAnswers,
            selectionMode: options.selectionMode ?? 'single',
            sheetTitle: options.sheetTitle,
            minNumberToShowInSheet:
                options.minNumberToShowInSheet ?? DEFAULT_MIN_NUMBER_TO_SHOW_IN_SHEET,
        };
    }

    setPossibleAnswers(answers: string[] | Answer[]) {
        this.setAnswerOptions({
            possibleAnswers: this.normalizeAnswers(answers),
            selectionMode: this.answerOptions?.selectionMode ?? 'single',
            sheetTitle: this.answerOptions?.sheetTitle,
            minNumberToShowInSheet: this.answerOptions?.minNumberToShowInSheet,
        });
    }

    private normalizeAnswers(answers: string[] | Answer[]) {
        if (!answers.length) return [];
        return typeof answers[0] === 'string'
            ? answers.map(answer => new Answer(answer as string))
            : answers as Answer[];
    }
    
    isAnswerValid(answer: Answer) {
        return validateValue(answer.value, this.validatorSpec);
    }

    override clone(): Question {
        return new Question(this.value, { ...this })
    }
}
