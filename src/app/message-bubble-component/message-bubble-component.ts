import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { 
  ChevronDown, 
  LucideAngularModule, 
  Check, 
  CheckCheck, 
  Clock, 
  CircleAlert 
} from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { AnswerSelectedEvent } from '../../classes/Client';
import { MessageStatus } from '../../enums/MessagesStatus';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, NgxFilesizeModule, HighlightPipe, LucideAngularModule],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() isSelected = false;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<{ answer: Answer; associatedQuestion: Question }>();
  @Output() messageOptionsRequested = new EventEmitter<Message>();
  readonly statusIcons = {
    [MessageStatus.Pending]: Clock,
    [MessageStatus.Sent]: Check,
    [MessageStatus.Read]: CheckCheck,
    [MessageStatus.Failed]: CircleAlert,
  };

  questionType = Question;
  readonly optionsIcon = ChevronDown;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.message as Question,
    });
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message);
  }

  get hasMessageOptions(): boolean {
    return this.message.editable || this.message.deletable;
  }
}
