import { ValidatorSpec } from "../interfaces/validation/ValidatorSpec";
import { Answer } from "./Answer";
import { Attachment, Message } from "./Message";
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

export class Question extends Message {
    private _possibleAnswers: Answer[] = [];
    public validatorSpec?: ValidatorSpec;
    public validationErrorMessage: string | Message  = "Invalid answer. Please try again.";
    public get possibleAnswers() {
        return this._possibleAnswers;
    }

    constructor(value: string, options?: {
        attachment?: Attachment;
        validator?: RegExp | ValidatorSpec;
        validationErrorMessage?: string | Message;
        possibleAnswers?: string[] | Answer[];
    }) {
        super(value, options?.attachment);
        if (options?.validator) {
            this.setValidator(options.validator, options.validationErrorMessage);
        }
        if (options?.possibleAnswers) {
            this.setPossibleAnswers(options.possibleAnswers);
        }
    }

    setValidator(validator: RegExp | ValidatorSpec, validationErrorMessage?: string | Message) {
        this.validatorSpec = coerceValidatorSpec(normalizeValidatorSpec(validator));
        if(validationErrorMessage) this.validationErrorMessage = validationErrorMessage;
    }

    setPossibleAnswers(answers: string[] | Answer[]) {
        if (answers.length === 0) {
            this._possibleAnswers = [];
        }
        else if(typeof answers[0] === 'string') 
            this._possibleAnswers = answers.map(answer => new Answer(answer as string));
        else 
            this._possibleAnswers = answers as Answer[];
    }
    
    isAnswerValid(answer: Answer) {
        return validateValue(answer.value, this.validatorSpec);
    }
}