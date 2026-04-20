export type MessageSender = 'client' | 'supporter';
export type MessageType = 'message' | 'question' | 'answer';
export type Attachment = { type: string, url: string };

export class Message {
    id?: number;
    from?: MessageSender;
    time: Date = new Date();
    tag: string = 'general';
    value: string;
    isRead: boolean = false;
    attachment?: Attachment;

    constructor(value: string, attachment?: Attachment) {
        this.value = value;
        this.attachment = attachment;
    }
}