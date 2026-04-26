import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';
import { FilePreviewComponent } from "../file-preview-component/file-preview-component";
import { Message } from '../../classes/Message';
import { LucideAngularModule, EllipsisVertical, Trash2 } from 'lucide-angular';
import { AppMenu, AppMenuItem } from '../shared/app-menu/app-menu';

@Component({
  selector: 'app-chat',
  imports: [
    MessageBubbleComponent,
    ChatInputComponent,
    FilePreviewComponent,
    LucideAngularModule,
    AppMenu,
  ],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  readonly menuIcon = EllipsisVertical;
  readonly deleteIcon = Trash2;
  readonly menuItems: AppMenuItem[] = [
    {
      id: 'delete-chat',
      label: 'Delete chat',
      icon: this.deleteIcon,
      tone: 'danger',
    },
  ];

  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  @Output() deleteChat = new EventEmitter<Chat>();
  attachmentFile?: File;

  sendMessage(message: string | Message): void {
    if (!this.chat) {
      return;
    }
    const messageValue = typeof message === 'string' ? message : message.value;
    const messageAttachment = message instanceof Message ? message.attachment : undefined;

    if (this.chat.messages.at(-1) instanceof Question) {
      this.chat.user.answer(new Answer(messageValue, messageAttachment));
    } else {
      this.chat.user.ask(new Question(messageValue, {attachment: messageAttachment}));
    }
  }

  closePreviewPage(): void {
    this.attachmentFile = undefined;
  }

  openPreviewPage(file: File){
    this.attachmentFile = file;
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
  }

  onMenuItemSelected(id: string): void {
    if (id === 'delete-chat' && this.chat) {
      this.deleteChat.emit(this.chat);
    }
  }
}
