import { Answer } from "./Answer";
import { Message } from "./Message";

export class Question extends Message {
    possibleAnswers: Answer[] | string[] = [];
    public validator: RegExp = /.*/;
    public validationErrorMessage: string | Message  = "מצטער, התשובה לא תקינה. נסה שוב.";

    setValidator(validator: RegExp  , validationErrorMessage?: string| Message) {
        this.validator = validator;
        if(validationErrorMessage) this.validationErrorMessage = validationErrorMessage;
        
    }
    
    isAnswerValid(answer: Answer){
        if(answer.value instanceof File) return true;
        return this.validator.test(answer.value);
    }
}