import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../highlight.pipe';
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
  @Output() answerSelected = new EventEmitter<Answer | string>();

  questionType = Question;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  possibleAnswerLabel(answer: Answer | string): string {
    if (typeof answer === 'string') {
      return answer;
    }

    return answer.value;
  }

  selectAnswer(answer: Answer | string): void {
    this.answerSelected.emit(answer);
  }
}
