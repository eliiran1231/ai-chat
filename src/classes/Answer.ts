import { Message, type MessageType } from "./Message";

export class Answer extends Message {
    override readonly messageType: MessageType = 'answer';
}