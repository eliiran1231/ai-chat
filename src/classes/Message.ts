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
    tag?: string,
    attachment?: Attachment,
    editable?: boolean,
    deletable?: boolean,
}

export class Message {
    id?: number;
    from?: MessageSender;
    time: Date = new Date();
    tag: string;
    value: string;
    isRead: boolean = false;
    attachment?: Attachment;
    editable: boolean;
    deletable: boolean;

    constructor(value: string, options?: MessageOptions) {
        this.value = value;
        this.attachment = options?.attachment;
        this.id = options?.id;
        this.editable = options?.editable ?? true;
        this.deletable = options?.deletable ?? true;
        this.tag = options?.tag ?? 'general';
    }
}
