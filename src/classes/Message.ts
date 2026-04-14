export class Message {
    id?: number;
    from?: "client" | "supporter";
    time: Date = new Date();
    tag: string = "general";
    value: string | File
    isRead: boolean = false;

    constructor(value: string | File){
        this.value = value;
    }
}