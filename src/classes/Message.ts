export type MessageSender = 'client' | 'supporter';
export type MessageType = 'message' | 'question' | 'answer';

export class Message {
    id?: number;
    from?: MessageSender;
    time: Date = new Date();
    tag: string = 'general';
    value: string;
    isRead: boolean = false;
    attachment?: {type: string, url: string};

    constructor(value: string, attachment?: {type: string, url: string} ) {
        this.value = value;
        this.attachment = attachment;
    }
}