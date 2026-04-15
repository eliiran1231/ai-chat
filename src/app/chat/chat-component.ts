import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  effect,
  EventEmitter,
  inject,
  Input,
  NgZone,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, TextFieldModule, MessageBubbleComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  readonly composerMaxRows = 5;
  private readonly bottomButtonOffsetRem = 10;
  composerHasOverflow = false;
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly activeChat = signal<Chat | null>(null);
  private readonly scrollRequest = signal(0);
  private readonly shouldObserveBottom = signal(false);
  private readonly isAtBottom = signal(true);
  readonly showScrollToBottomButton = computed(
    () => this.shouldObserveBottom() && !this.isAtBottom(),
  );
  readonly highlightScrollToBottomButton = signal(false);
  private boundChat: Chat | null = null;
  private scrollButtonHighlightTimeout: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true })
  set chat(value: Chat | null) {
    this.activeChat.set(value);
    this.shouldObserveBottom.set(false);
    this.isAtBottom.set(true);
    this.highlightScrollToBottomButton.set(false);
  }

  get chat(): Chat | null {
    return this.activeChat();
  }

  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  readonly thread = viewChild<ElementRef<HTMLElement>>('thread');
  readonly bottomSentinel = viewChild<ElementRef<HTMLElement>>('bottomSentinel');

  constructor() {
    effect(() => {
      const chat = this.activeChat();

      if (!chat) {
        this.boundChat = null;
        return;
      }

      if (this.boundChat === chat) {
        return;
      }

      this.boundChat = chat;
      this.shouldObserveBottom.set(false);
      this.bindMessageListeners(chat);
      this.requestScrollToBottom();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.shouldObserveBottom.set(true);
        });
      });
    });

    effect(() => {
      if (this.scrollRequest() === 0) {
        return;
      }

      const thread = this.thread()?.nativeElement;

      if (!thread) {
        return;
      }

      queueMicrotask(() => {
        this.scrollToBottom(thread);
        requestAnimationFrame(() => this.scrollToBottom(thread));
      });
    });

    effect((onCleanup) => {
      const thread = this.thread()?.nativeElement;
      const bottomSentinel = this.bottomSentinel()?.nativeElement;

      if (!this.shouldObserveBottom() || !thread || !bottomSentinel) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          this.ngZone.run(() => {
            this.setBottomState(entry?.isIntersecting ?? false);
          });
        },
        {
          root: thread,
          rootMargin: `0px 0px ${this.getBottomObserverOffsetPx()}px 0px`,
          threshold: 0,
        },
      );

      observer.observe(bottomSentinel);
      onCleanup(() => observer.disconnect());
    });
  }

  sendMessage(form?: NgForm): void {
    const chat = this.chat;

    if (!chat) {
      return;
    }

    const trimmedMessage = chat.draftMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    if (chat.messages.at(-1) instanceof Question) {
      chat.user.answer(trimmedMessage);
    } else {
      chat.user.ask(trimmedMessage);
    }
    chat.draftMessage = '';
    this.composerHasOverflow = false;
    form?.resetForm({ message: '' });
    this.requestScrollToBottom();
  }

  selectAnswer(answer: Answer | string): void {
    // this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer, 'user'));
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
    this.requestScrollToBottom();

  }

  handleComposerKeydown(
    event: KeyboardEvent,
    _autosize: CdkTextareaAutosize,
    _textarea: HTMLTextAreaElement,
  ): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    autosize.resizeToFitContent(true);
    this.composerHasOverflow = textarea.scrollHeight > textarea.clientHeight;
  }

  scrollThreadToBottom(): void {
    this.requestScrollToBottom();
  }

  private bindMessageListeners(chat: Chat): void {
    chat.user.setOnMessageAdded(() => {
      this.requestScrollToBottom();
    });

    chat.supporter.setOnMessageAdded((_message: Message) => {
      const shouldAutoScroll = this.isAtBottom();

      requestAnimationFrame(() => {
        this.ngZone.run(() => {
          this.changeDetectorRef.detectChanges();

          if (shouldAutoScroll) {
            this.requestScrollToBottom();
            return;
          }

          this.highlightScrollToBottomButton.set(true);
          if (this.scrollButtonHighlightTimeout) {
            clearTimeout(this.scrollButtonHighlightTimeout);
          }
          this.scrollButtonHighlightTimeout = setTimeout(() => {
            this.highlightScrollToBottomButton.set(false);
          }, 900);
        });
      });
    });
  }

  private requestScrollToBottom(): void {
    this.scrollRequest.update((value) => value + 1);
  }

  private scrollToBottom(thread: HTMLElement): void {
    thread.scrollTop = thread.scrollHeight;
  }

  private setBottomState(isAtBottom: boolean): void {
    this.isAtBottom.set(isAtBottom);

    if (isAtBottom) {
      this.highlightScrollToBottomButton.set(false);
      if (this.scrollButtonHighlightTimeout) {
        clearTimeout(this.scrollButtonHighlightTimeout);
        this.scrollButtonHighlightTimeout = null;
      }
    }
  }

  private getBottomObserverOffsetPx(): number {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const fontSize = Number.isFinite(rootFontSize) ? rootFontSize : 16;
    return fontSize * this.bottomButtonOffsetRem;
  }
}
