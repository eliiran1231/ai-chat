import { Answer } from "./Answer";
import { Message, type MessageType } from "./Message";
import {
    coerceValidatorSpec,
    normalizeValidatorSpec,
    validateValue,
    type ValidatorSpec,
} from "./MessageValidator";

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
    override readonly messageType: MessageType = 'question';
    private _possibleAnswers: Answer[] = [];
    public validatorSpec?: ValidatorSpec;
    public validationErrorMessage: string | Message  = "Invalid answer. Please try again.";
    public get possibleAnswers() {
        return this._possibleAnswers;
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
        if(answer.value instanceof File) return true;
        return validateValue(answer.value, this.validatorSpec);
    }
}