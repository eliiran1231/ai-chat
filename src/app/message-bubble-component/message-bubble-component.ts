import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Output() answerSelected = new EventEmitter<Answer | string>();

  questionType = Question;

  constructor() {}

  messageText(message: Message): string {
    return typeof message.value === 'string' ? message.value : message.value.name;
  }

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  possibleAnswerLabel(answer: Answer | string): string {
    if (typeof answer === 'string') {
      return answer;
    }

    return typeof answer.value === 'string' ? answer.value : answer.value.name;
  }

  selectAnswer(answer: Answer | string): void {
    this.answerSelected.emit(answer);
  }
}
