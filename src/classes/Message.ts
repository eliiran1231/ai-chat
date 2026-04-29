export type MessageSender = 'client' | 'supporter';
export type MessageType = 'message' | 'question' | 'answer';
export type Attachment = { 
    type: string,
    url: string,
    size: number,
    extension: string,
    name: string 
};
export type MessageOptions = {
    id?: number,
    attachment?: Attachment
}

export class Message {
    id?: number;
    from?: MessageSender;
    time: Date = new Date();
    tag: string = 'general';
    value: string;
    isRead: boolean = false;
    attachment?: Attachment;

    constructor(value: string, options?: MessageOptions) {
        this.value = value;
        this.attachment = options?.attachment;
        this.id = options?.id;
    }
}