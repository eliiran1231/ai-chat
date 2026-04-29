import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { ChatNavbarComponent } from '../chat-navbar-component/chat-navbar-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';
import { FilePreviewComponent } from "../file-preview-component/file-preview-component";
import { MessageOptions } from '../../classes/Message';
import { NgScrollbar } from 'ngx-scrollbar';
import { NgScrollReachDrop } from 'ngx-scrollbar/reached-event';
import { ChevronsDown, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-chat',
  imports: [MessageBubbleComponent, ChatInputComponent, FilePreviewComponent, ChatNavbarComponent, NgScrollbar, NgScrollReachDrop, LucideAngularModule],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  readonly SCROLLBAR_OFFSET = 40;
  readonly scrollDownIcon = ChevronsDown;
  @Output() deleteChat = new EventEmitter<Chat>();
  attachmentFile?: File;
  searchQuery = '';
  matchingMessageIds: number[] = [];
  activeSearchResultIndex = -1;
  awayFromBottom = false;

  @ViewChild('chatScrollbar') scrollbar!: NgScrollbar;

  sendMessage(messageValue: string, options?: MessageOptions): void {
    this.chat.supporter.expects == 'question' ?
      this.chat.user.ask(new Question(messageValue, options)) : 
      this.chat.user.answer(new Answer(messageValue, options));
    this.awayFromBottom = false; //little cheat to tell scrollIfNeeded to scroll after message sent
  }

  selectAnswer(answer: Answer): void {
    this.chat.user.answer(answer);
    this.awayFromBottom = false;
  }

  closePreviewPage(): void {
    this.attachmentFile = undefined;
  }

  openPreviewPage(file: File){
    this.attachmentFile = file;
  }

  updateSearch(query: string): void {
    this.searchQuery = query;
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      this.clearSearch();
      return;
    }

    this.matchingMessageIds = this.chat.messages
      .filter((message) => message.value.toLocaleLowerCase().includes(normalizedQuery))
      .map((message) => message.id)
      .filter((messageId): messageId is number => messageId !== undefined);

    this.activeSearchResultIndex = this.matchingMessageIds.length ? 0 : -1;
    this.scrollToActiveSearchResult();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.matchingMessageIds = [];
    this.activeSearchResultIndex = -1;
  }

  stepInSearch(steps: number = 1){
    if (!this.matchingMessageIds.length) {
      return;
    }

    this.activeSearchResultIndex = (this.activeSearchResultIndex + steps) % this.matchingMessageIds.length;
    this.scrollToActiveSearchResult();
  }

  isActiveSearchMatch(messageId: number | undefined): boolean {
    return this.matchingMessageIds[this.activeSearchResultIndex] === messageId;
  }

  private scrollToActiveSearchResult(): void {
    const activeMessageId = this.matchingMessageIds[this.activeSearchResultIndex];

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

  showScrollButton(){
    this.awayFromBottom = true;
  }
  
  hideScrollButton(){
    this.awayFromBottom = false;
  }

  scrollToBottom() {
    return this.scrollbar.scrollTo({
      bottom: 0,
      duration: 0
    });
  }
}
