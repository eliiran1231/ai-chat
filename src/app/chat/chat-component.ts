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

const BOTTOM_PROXIMITY_OFFSET_REM = 10;
const SCROLL_BUTTON_HIGHLIGHT_DURATION_MS = 900;

@Component({
  selector: 'app-chat',
  imports: [FormsModule, TextFieldModule, MessageBubbleComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  readonly composerMaxRows = 5;
  composerHasOverflow = false;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  private readonly activeChat = signal<Chat | null>(null);
  private readonly shouldObserveBottom = signal(false);
  private readonly isAtBottom = signal(true);

  readonly showScrollToBottomButton = computed(
    () => this.shouldObserveBottom() && !this.isAtBottom(),
  );
  readonly highlightScrollToBottomButton = signal(false);

  @Input({ required: true })
  set chat(value: Chat | null) {
    this.cancelScheduledScroll();
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

  private readonly bottomProximityOffsetPx = this.computeBottomProximityOffsetPx();
  private scrollButtonHighlightTimeout: ReturnType<typeof setTimeout> | null = null;
  private scheduledScrollFrameId: number | null = null;
  private scheduledScrollId = 0;

  constructor() {
    this.registerDestroyCleanup();
    this.registerChatLifecycleEffect();
    this.registerBottomObserverEffect();
  }

  // Chat actions
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
    this.scheduleScrollToBottom();
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
    this.scheduleScrollToBottom();
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
    this.scheduleScrollToBottom();
  }

  // Chat lifecycle / listener wiring
  private registerDestroyCleanup(): void {
    this.destroyRef.onDestroy(() => {
      this.cancelScheduledScroll();
      this.resetScrollButtonHighlight();
    });
  }

  private registerChatLifecycleEffect(): void {
    effect((onCleanup) => {
      const chat = this.activeChat();

      if (!chat) {
        this.shouldObserveBottom.set(false);
        this.resetScrollButtonHighlight();
        return;
      }

      this.shouldObserveBottom.set(false);
      const cleanupListeners = this.bindMessageListeners(chat);
      this.scheduleInitialScroll();

      onCleanup(() => {
        cleanupListeners();
      });
    });
  }

  private bindMessageListeners(chat: Chat): () => void {
    let listenersActive = true;
    const pendingIncomingMessageFrameIds = new Set<number>();

    const detachUserListener = chat.user.subscribeOnMessageAdded(() => {
      this.scheduleScrollToBottom();
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
            this.scheduleScrollToBottom();
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

  // Scroll coordination
  private scheduleInitialScroll(): void {
    this.scheduleScrollToBottom(() => {
      this.shouldObserveBottom.set(true);
    });
  }

  private scheduleScrollToBottom(onAfterScroll?: () => void): void {
    const thread = this.thread()?.nativeElement;

    if (!thread) {
      return;
    }

    this.cancelScheduledScroll();
    const scheduledScrollId = ++this.scheduledScrollId;

    queueMicrotask(() => {
      if (scheduledScrollId !== this.scheduledScrollId) {
        return;
      }

      this.scrollToBottom(thread);
      // A follow-up frame keeps long or asynchronously-sized content pinned after layout settles.
      this.scheduledScrollFrameId = requestAnimationFrame(() => {
        if (scheduledScrollId !== this.scheduledScrollId) {
          return;
        }

        this.scheduledScrollFrameId = null;
        this.scrollToBottom(thread);
        onAfterScroll?.();
      });
    });
  }

  private scrollToBottom(thread: HTMLElement): void {
    thread.scrollTop = thread.scrollHeight;
  }

  private cancelScheduledScroll(): void {
    this.scheduledScrollId += 1;
    if (this.scheduledScrollFrameId !== null) {
      cancelAnimationFrame(this.scheduledScrollFrameId);
      this.scheduledScrollFrameId = null;
    }
  }

  // Bottom observer state
  private registerBottomObserverEffect(): void {
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
          rootMargin: `0px 0px ${this.bottomProximityOffsetPx}px 0px`,
          threshold: 0,
        },
      );

      observer.observe(bottomSentinel);
      onCleanup(() => observer.disconnect());
    });
  }

  private setBottomState(isAtBottom: boolean): void {
    this.isAtBottom.set(isAtBottom);

    if (isAtBottom) {
      this.resetScrollButtonHighlight();
    }
  }

  private computeBottomProximityOffsetPx(): number {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const fontSize = Number.isFinite(rootFontSize) ? rootFontSize : 16;
    // Keep users "near bottom" for both auto-scroll and button visibility within a comfortable reach.
    return fontSize * BOTTOM_PROXIMITY_OFFSET_REM;
  }

  // Scroll button highlight
  private highlightScrollButton(): void {
    this.highlightScrollToBottomButton.set(true);
    if (this.scrollButtonHighlightTimeout) {
      clearTimeout(this.scrollButtonHighlightTimeout);
    }
    this.scrollButtonHighlightTimeout = setTimeout(() => {
      this.highlightScrollToBottomButton.set(false);
      this.scrollButtonHighlightTimeout = null;
    }, SCROLL_BUTTON_HIGHLIGHT_DURATION_MS);
  }

  private resetScrollButtonHighlight(): void {
    this.highlightScrollToBottomButton.set(false);
    if (this.scrollButtonHighlightTimeout) {
      clearTimeout(this.scrollButtonHighlightTimeout);
      this.scrollButtonHighlightTimeout = null;
    }
  }
}
