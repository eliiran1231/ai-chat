import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Chat } from '../../classes/Chat';
import { Question } from '../../classes/Question';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent implements AfterViewInit, OnChanges {
  private readonly composerFallbackFontSize = 16;
  private readonly composerFallbackLineHeight = 22;
  private readonly composerMaxLines = 4;
  private resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true }) chat: Chat | null = null;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;
  questionType = Question;

  ngAfterViewInit(): void {
    this.scheduleComposerResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chat']) {
      this.scheduleComposerResize();
    }
  }

  sendMessage(): void {
    if (!this.chat) {
      return;
    }

    const trimmedMessage = this.chat.draftMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    this.chat.user.answer(new Answer(trimmedMessage, 'user'));
    this.chat.draftMessage = '';
    if (this.messageInput) {
      this.messageInput.nativeElement.value = '';
    }
    this.resizeComposer();
  }

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
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer, 'user'));
  }

  onDraftInput(): void {
    this.resizeComposer();
  }

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.sendMessage();
  }

  private scheduleComposerResize(): void {
    if (this.resizeTimeoutId !== null) {
      return;
    }

    this.resizeTimeoutId = setTimeout(() => {
      this.resizeTimeoutId = null;
      this.resizeComposer();
    }, 0);
  }

  private resizeComposer(): void {
    const composer = this.messageInput?.nativeElement;
    if (!composer) {
      return;
    }

    composer.style.height = 'auto';

    const styles = window.getComputedStyle(composer);
    const fontSize = this.resolveCssLength(
      styles.fontSize,
      this.composerFallbackFontSize,
      this.composerFallbackFontSize,
    );
    const lineHeight = this.resolveLineHeight(styles.lineHeight, fontSize);
    const paddingTop = this.resolveCssLength(styles.paddingTop, 0, fontSize);
    const paddingBottom = this.resolveCssLength(styles.paddingBottom, 0, fontSize);
    const borderTop = this.resolveCssLength(styles.borderTopWidth, 0, fontSize);
    const borderBottom = this.resolveCssLength(styles.borderBottomWidth, 0, fontSize);
    const verticalInsets = paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = lineHeight + verticalInsets;
    const maxHeight = lineHeight * this.composerMaxLines + verticalInsets;
    const targetHeight = Math.min(Math.max(composer.scrollHeight, minHeight), maxHeight);

    composer.style.height = `${targetHeight}px`;
    composer.style.overflowY = composer.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  private resolveLineHeight(lineHeight: string, fontSize: number): number {
    const parsedLineHeight = Number.parseFloat(lineHeight);
    if (!Number.isFinite(parsedLineHeight)) {
      return this.composerFallbackLineHeight;
    }

    if (lineHeight.endsWith('rem') || lineHeight.endsWith('em')) {
      return parsedLineHeight * this.composerFallbackFontSize;
    }

    if (lineHeight.endsWith('px') || parsedLineHeight > 4) {
      return parsedLineHeight;
    }

    return parsedLineHeight * fontSize;
  }

  private resolveCssLength(value: string, fallback: number, relativeBase: number): number {
    const parsedValue = Number.parseFloat(value);
    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    if (value.endsWith('rem') || value.endsWith('em')) {
      return parsedValue * relativeBase;
    }

    return parsedValue;
  }
}
