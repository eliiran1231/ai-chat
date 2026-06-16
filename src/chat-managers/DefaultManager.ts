import { Injectable } from "@angular/core";
import { ChatManager } from "../classes/ChatManager";

@Injectable({
    providedIn: 'root'
})

export class DefaultManager extends ChatManager {}