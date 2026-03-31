export class Message {
    from: "user" | "supporter";
    time: Date = new Date();
    tag: string = "general";
    value: string | File

    constructor(value: string | File, from: "user" | "supporter"){
        this.from = from;
        this.value = value;
    }
}