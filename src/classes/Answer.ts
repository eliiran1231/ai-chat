import { Message, type MessageType } from "./Message";

export class Answer extends Message {
    override messageType: MessageType = 'answer';
}