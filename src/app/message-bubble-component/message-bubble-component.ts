import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
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
  message = input.required<Message>();
  isActiveSearchMatch = input(false);
  isSelected = input(false);
  searchTerm = input('');
  answerSelected = output<{ answer: Answer; associatedQuestion: Question }>();
  messageOptionsRequested = output<Message>();
  readonly statusIcons = {
    [MessageStatus.Pending]: Clock,
    [MessageStatus.Sent]: Check,
    [MessageStatus.Read]: CheckCheck,
    [MessageStatus.Failed]: CircleAlert,
  };

  readonly optionsIcon = ChevronDown;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from() === 'supporter';
  }

  asQuestion(message: Message): Question | undefined {
    return message instanceof Question ? message : undefined;
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.message() as Question,
    });
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message());
  }

  hasMessageOptions = computed(() => this.message().editable() || this.message().deletable());
}
