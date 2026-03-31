import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';

import { Answer } from '../../classes/Answer';
import { User } from '../../classes/User';
import { AiAgent } from '../../agents/AiAgent';
import { HttpClient } from '@angular/common/http';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit {
  draftMessage = '';
  messages: Message[] = [];
  supporter : Supporter;
  user : User;
  
  constructor(private aiService: AiService) {
    this.supporter = new Supporter(this.messages);
    this.user = new User(this.messages, this.supporter);
    this.aiService = aiService;
  }
  
  ngOnInit(): void {
    this.supporter.setAgent(new AiAgent(this.aiService));
  }

  sendMessage(): void {
    const trimmedMessage = this.draftMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    this.user.answer(new Answer(trimmedMessage, 'user'));
    this.draftMessage = '';
  }

  messageText(message: Message): string {
    return typeof message.value === 'string' ? message.value : message.value.name;
  }

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }
}
