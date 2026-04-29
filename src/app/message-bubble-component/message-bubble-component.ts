import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, NgxFilesizeModule, HighlightPipe],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<Answer>();

  questionType = Question;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit(answer);
  }
}
