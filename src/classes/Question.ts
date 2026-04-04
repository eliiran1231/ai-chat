import { Answer } from "./Answer";
import { Message } from "./Message";

export class Question extends Message {
    possibleAnswers: Answer[] | string[] = [];
    private validator: RegExp | ((answer: Answer)=>boolean) = ()=>true;
    
    setValidator(validator: RegExp | ((answer: Answer)=>boolean)) {
        this.validator = validator;
    }
    
    isAnswerValid(answer: Answer){
        if(this.validator instanceof RegExp){
            if(answer.value instanceof File) return false;
            return this.validator.test(answer.value);
        }
        else{
            return this.validator(answer);
        }
    }
}