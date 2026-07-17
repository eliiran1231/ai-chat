import { DatePipe } from '@angular/common';
import { Component, ViewChild, computed, effect, input, output, signal } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { ChatNavbarComponent } from '../chat-navbar-component/chat-navbar-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';
import { FilePreviewComponent } from "../file-preview-component/file-preview-component";
import { Message, MessageOptions } from '../../classes/Message';
import { NgScrollbar } from 'ngx-scrollbar';
import { NgScrollReachDrop } from 'ngx-scrollbar/reached-event';
import { LucideChevronsDown, LucideDynamicIcon } from '@lucide/angular';
import { Uuid } from '../../interfaces/db/Uuid';
import { ChatMessageDatePipe } from '../../utils/chat-message-date.pipe';
import {
  shouldShowDateSeparator,
  shouldShowMessageTail,
} from '../../utils/chat-message-date-separator';

@Component({
  selector: 'app-chat',
  imports: [
    MessageBubbleComponent,
    ChatInputComponent,
    FilePreviewComponent,
    ChatNavbarComponent,
    NgScrollbar,
    NgScrollReachDrop,
    DatePipe,
    ChatMessageDatePipe,
    LucideDynamicIcon
  ],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  readonly shouldShowDateSeparator = shouldShowDateSeparator;
  readonly shouldShowMessageTail = shouldShowMessageTail;

  constructor() {
    effect(() => {
      if (this.chat()) {
        this.selectedMessage.set(undefined);
        this.editingMessage.set(undefined);
      }
    });
  }

  chat = input.required<Chat>();
  showBackButton = input(false);
  back = output<void>();
  readonly SCROLLBAR_OFFSET = 40;
  readonly scrollDownIcon = LucideChevronsDown;
  deleteChat = output<Chat>();
  attachmentFile = signal<File | undefined>(undefined);
  searchQuery = signal('');
  matchingMessageIds = computed(() => {
    const normalizedQuery = this.searchQuery().trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return this.chat().messages()
      .filter((message) => message.value().toLocaleLowerCase().includes(normalizedQuery))
      .map((message) => message.id());
  });
  activeSearchResultIndex = signal(-1);
  selectedMessage = signal<Message | undefined>(undefined);
  editingMessage = signal<Message | undefined>(undefined);
  awayFromBottom = signal(false);
  isScrolling = signal(false);
  isAnswerSheetOpen = signal(false);
  isLoadingOlderMessages = signal(false);

  onScroll(): void {
    if (!this.isScrolling()) {
      this.isScrolling.set(true);
    }
  }
  onChatScrollEnd(): void {
    this.isScrolling.set(false);
  }

  onTopReached(): void {
    void this.loadOlderMessages();
  }

  async loadOlderMessages(): Promise<void> {
    if (this.isLoadingOlderMessages()) return;

    this.isLoadingOlderMessages.set(true);
    try {
      const previousContentHeight = this.scrollbar.adapter.contentHeight;
      const previousScrollTop = this.scrollbar.adapter.scrollTop;
      const loaded = await this.chat().loader.loadNextChunk();

      if (loaded.length > 0) {
        requestAnimationFrame(() => {
          const addedHeight = this.scrollbar.adapter.contentHeight - previousContentHeight;
          this.scrollbar.adapter.scrollYTo(previousScrollTop + addedHeight);
        });
      }
    } finally {
      this.isLoadingOlderMessages.set(false);
    }
  }

  @ViewChild('chatScrollbar') scrollbar!: NgScrollbar;

  async sendMessage(messageValue: string, options?: MessageOptions) {
    let editingMessage = this.editingMessage();
    if (editingMessage) {  
      this.closeMessageOptions();
      await editingMessage.edit(messageValue);
      return;
    }

    this.chat().supporter.expects() == 'question'
      ? await this.chat().user.ask(new Question(messageValue, options))
      : await this.chat().user.answer(new Answer(messageValue, options));
    this.awayFromBottom.set(false); //little cheat to tell scrollIfNeeded to scroll after message sent
  }

  selectAnswer(
    answer: Answer | Answer[],
    associatedQuestion: Question,
    associatedQuestionIndex: number,
  ): void {
    this.chat().user.onAnswerSelected.next({ answer, associatedQuestion, associatedQuestionIndex });
    this.awayFromBottom.set(false);
  }

  setAnswerSheetOpen(isOpen: boolean): void {
    this.isAnswerSheetOpen.set(isOpen);
  }

  closePreviewPage(): void {
    this.attachmentFile.set(undefined);
  }

  openPreviewPage(file: File) {
    this.attachmentFile.set(file);
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.activeSearchResultIndex.set(this.matchingMessageIds().length ? 0 : -1);
    this.scrollToActiveSearchResult();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.activeSearchResultIndex.set(-1);
  }

  openMessageOptions(message: Message): void {
    if (this.editingMessage()) {
      return;
    }
    this.selectedMessage.set(message);
  }

  closeMessageOptions(): void {
    this.selectedMessage.set(undefined);
    this.editingMessage.set(undefined);
    this.chat().draftMessage.set('');
  }

  editMessage(message: Message): void {
    if (message.from() === 'supporter' || !message.editable()) {
      return;
    }
    this.selectedMessage.set(message);
    this.editingMessage.set(message);
    this.chat().draftMessage.set(message.value());
  }

  async deleteMessage(message: Message) {
    this.closeMessageOptions();
    await message.delete();
  }

  async retryMessage(message: Message) {
    this.closeMessageOptions();
    await message.retry();
  }

  stepInSearch(steps: number = 1) {
    if (!this.matchingMessageIds().length) {
      return;
    }
    this.activeSearchResultIndex.update((current) => {
      const len = this.matchingMessageIds().length;
      return (current + steps + len) % len;
    });
    this.scrollToActiveSearchResult();
  }

  isActiveSearchMatch(messageId: Uuid): boolean {
    return !!messageId && this.matchingMessageIds()[this.activeSearchResultIndex()] === messageId;
  }

  private scrollToActiveSearchResult(): void {
    const activeMessageId = this.matchingMessageIds()[this.activeSearchResultIndex()];

    if (activeMessageId === undefined) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(`${activeMessageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  showScrollButton() {
    this.awayFromBottom.set(true);
  }

  hideScrollButton() {
    this.awayFromBottom.set(false);
  }

  scrollToBottom() {
    return this.scrollbar.scrollTo({
      bottom: 0,
      duration: 0,
    });
  }
}
