export class Message {
    id?: number;
    from: "user" | "supporter";
    time: Date = new Date();
    tag: string = "general";
    value: string | File
    isRead: boolean = false;

    constructor(value: string | File, from: "user" | "supporter"){
        this.from = from;
        this.value = value;
        this.isRead = from === "user";
    }
}