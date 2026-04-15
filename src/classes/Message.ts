export type MessageSender = 'client' | 'supporter';
export type MessageType = 'message' | 'question' | 'answer';

export class Message {
    id?: number;
    from?: MessageSender;
    time: Date = new Date();
    tag: string = 'general';
    value: string | File;
    isRead: boolean = false;

    constructor(value: string | File) {
        this.value = value;
    }
}