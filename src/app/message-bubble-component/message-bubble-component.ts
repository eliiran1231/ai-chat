import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { checkcheck } from '../../assets/icons/check-check';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideCheck,
  LucideClock,
  LucideCircleAlert
} from '@lucide/angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { MessageStatus } from '../../enums/MessagesStatus';
import { FilesizePipe } from '../../pipes/filesize.pipe';
import { QuestionAnswerControlsComponent } from '../question-answer-controls-component/question-answer-controls-component';
import { TranslatePipe } from '../shared/translate.pipe';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, FilesizePipe, HighlightPipe, LucideDynamicIcon, QuestionAnswerControlsComponent, TranslatePipe],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  message = input.required<Message>();
  isActiveSearchMatch = input(false);
  isSelected = input(false);
  showTail = input(false);
  searchTerm = input('');
  answerSelected = output<{ answer: Answer | Answer[]; associatedQuestion: Question }>();
  messageOptionsRequested = output<Message>();
  answerSheetOpenChange = output<boolean>();

  readonly statusIcons = {
    [MessageStatus.Pending]: LucideClock,
    [MessageStatus.Sent]: LucideCheck,
    [MessageStatus.Read]: checkcheck,
    [MessageStatus.Failed]: LucideCircleAlert,
  };
  readonly optionsIcon = LucideChevronDown;

  isSupporterMessage(message: Message): boolean {
    return message.from() === 'supporter';
  }

  asQuestion(message: Message): Question | undefined {
    return message instanceof Question ? message : undefined;
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message());
  }

  hasMessageOptions = computed(() => this.message().editable() || this.message().deletable());
  hasAnswerControls = computed(() => this.asQuestion(this.message())?.possibleAnswers().length ? true : false);
}
