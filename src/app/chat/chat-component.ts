import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly activeChat = signal<Chat | null>(null);
  private readonly scrollRequest = signal(0);
  private readonly shouldObserveBottom = signal(false);
  private readonly isAtBottom = signal(true);
  readonly showScrollToBottomButton = computed(
    () => this.shouldObserveBottom() && !this.isAtBottom(),
  );
  readonly highlightScrollToBottomButton = signal(false);
  private scrollButtonHighlightTimeout: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true })
  set chat(value: Chat | null) {
    this.activeChat.set(value);
    this.shouldObserveBottom.set(false);
    this.isAtBottom.set(true);
    this.composerHasOverflow = false;
    this.resetScrollButtonHighlight();
  }

  get chat(): Chat | null {
    return this.activeChat();
  }

  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  readonly thread = viewChild<ElementRef<HTMLElement>>('thread');
  readonly bottomSentinel = viewChild<ElementRef<HTMLElement>>('bottomSentinel');

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.resetScrollButtonHighlight();
    });

    effect((onCleanup) => {
      const chat = this.activeChat();

      if (!chat) {
        this.shouldObserveBottom.set(false);
        this.resetScrollButtonHighlight();
        return;
      }

      this.shouldObserveBottom.set(false);
      const cleanupListeners = this.bindMessageListeners(chat);
      this.requestScrollToBottom();

      let enableObserverFrameId: number | null = null;
      let enableObserverConfirmationFrameId: number | null = null;

      enableObserverFrameId = requestAnimationFrame(() => {
        enableObserverConfirmationFrameId = requestAnimationFrame(() => {
          this.shouldObserveBottom.set(true);
        });
      });

      onCleanup(() => {
        cleanupListeners();
        if (enableObserverFrameId !== null) {
          cancelAnimationFrame(enableObserverFrameId);
        }
        if (enableObserverConfirmationFrameId !== null) {
          cancelAnimationFrame(enableObserverConfirmationFrameId);
        }
      });
    });

    effect((onCleanup) => {
      if (this.scrollRequest() === 0) {
        return;
      }

      const thread = this.thread()?.nativeElement;

      if (!thread) {
        return;
      }

      let cancelled = false;
      let followUpFrameId: number | null = null;

      queueMicrotask(() => {
        if (cancelled) {
          return;
        }

        this.scrollToBottom(thread);
        // A follow-up frame keeps long or asynchronously-sized content pinned after layout settles.
        followUpFrameId = requestAnimationFrame(() => {
          if (!cancelled) {
            this.scrollToBottom(thread);
          }
        });
      });

      onCleanup(() => {
        cancelled = true;
        if (followUpFrameId !== null) {
          cancelAnimationFrame(followUpFrameId);
        }
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
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
    this.requestScrollToBottom();
  }

  handleComposerKeydown(event: KeyboardEvent): void {
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

  private bindMessageListeners(chat: Chat): () => void {
    let listenersActive = true;
    const pendingIncomingMessageFrameIds = new Set<number>();

    const detachUserListener = chat.user.subscribeOnMessageAdded(() => {
      this.requestScrollToBottom();
    });

    const detachSupporterListener = chat.supporter.subscribeOnMessageAdded(() => {
      const shouldAutoScroll = this.isAtBottom();
      const incomingMessageFrameId = requestAnimationFrame(() => {
        pendingIncomingMessageFrameIds.delete(incomingMessageFrameId);
        this.ngZone.run(() => {
          if (!listenersActive) {
            return;
          }

          this.changeDetectorRef.detectChanges();

          if (shouldAutoScroll) {
            this.requestScrollToBottom();
            return;
          }

          this.highlightScrollButton();
        });
      });
      pendingIncomingMessageFrameIds.add(incomingMessageFrameId);
    });

    return () => {
      listenersActive = false;
      detachUserListener();
      detachSupporterListener();
      pendingIncomingMessageFrameIds.forEach((frameId) => cancelAnimationFrame(frameId));
      pendingIncomingMessageFrameIds.clear();
      this.resetScrollButtonHighlight();
    };
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
      this.resetScrollButtonHighlight();
    }
  }

  private getBottomObserverOffsetPx(): number {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const fontSize = Number.isFinite(rootFontSize) ? rootFontSize : 16;
    return fontSize * this.bottomButtonOffsetRem;
  }

  private highlightScrollButton(): void {
    this.highlightScrollToBottomButton.set(true);
    if (this.scrollButtonHighlightTimeout) {
      clearTimeout(this.scrollButtonHighlightTimeout);
    }
    this.scrollButtonHighlightTimeout = setTimeout(() => {
      this.highlightScrollToBottomButton.set(false);
      this.scrollButtonHighlightTimeout = null;
    }, 900);
  }

  private resetScrollButtonHighlight(): void {
    this.highlightScrollToBottomButton.set(false);
    if (this.scrollButtonHighlightTimeout) {
      clearTimeout(this.scrollButtonHighlightTimeout);
      this.scrollButtonHighlightTimeout = null;
    }
  }
}
