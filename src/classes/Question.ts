import { Answer } from "./Answer";
import { Message } from "./Message";

export class Question extends Message {
    private _possibleAnswers: Answer[] = [];
    public validator: RegExp = /.*/;
    public validationErrorMessage: string | Message  = "Invalid answer. Please try again.";
    public get possibleAnswers() {
        return this._possibleAnswers;
    }

    setValidator(validator: RegExp, validationErrorMessage?: string | Message) {
        this.validator = validator;
        if(validationErrorMessage) this.validationErrorMessage = validationErrorMessage;
    }

    setPossibleAnswers(answers: string[] | Answer[]) {
        if(Array.isArray(answers) && typeof answers[0] === 'string') 
            this._possibleAnswers = answers.map(answer => new Answer(answer as string));
        else 
            this._possibleAnswers = answers as Answer[];
    }
    
    isAnswerValid(answer: Answer) {
        if(answer.value instanceof File) return true;
        return this.validator.test(answer.value);
    }
}