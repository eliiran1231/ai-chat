import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { LucideAngularModule, Paperclip, SendHorizontal } from 'lucide-angular';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-input-component',
  imports: [FormsModule, TextFieldModule, LucideAngularModule],
  templateUrl: './chat-input-component.html',
  styleUrl: './chat-input-component.scss',
})
export class 
ChatInputComponent {
  readonly composerMaxRows = 5;
  readonly attachIcon = Paperclip;
  readonly sendIcon = SendHorizontal;
  composerHasOverflow = false;
  private activeChat?: Chat;
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() set chat(chat: Chat | undefined) {
    const chatChanged = chat !== this.activeChat;
    this.activeChat = chat;
    if (chat && chatChanged) {
      this.caption = chat.draftMessage;
    }
  }
  get chat(): Chat | undefined {
    return this.activeChat;
  }
  @Input() requiredContent = true;
  @Input() set value(value: string) {
    this.caption = value;
  }
  @Input() placeholder = 'Type a message';
  @Input() allowAttachments = true;
  @Output() messageSubmit = new EventEmitter<string>();
  @Output() fileSubmit = new EventEmitter<File>();
  @Output() valueChange = new EventEmitter<string>();
  caption = '';

  submitMessage(form?: NgForm): void {
    const trimmedMessage = this.caption.trim();
    if (!this.requiredContent || trimmedMessage) {
      this.messageSubmit.emit(trimmedMessage);
      this.updateCaption('');
    }
    this.composerHasOverflow = false;
    form?.resetForm({ message: '' });
  }

  pickFile(): void {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'file/*';
    input.multiple = false;
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          this.fileSubmit.emit(file);
        };
    };
    input.click();
  }


  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  updateCaption(value: string): void {
    this.caption = value;
    if (this.chat) {
      this.chat.draftMessage = value;
    }
    this.valueChange.emit(value);
  }

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    autosize.resizeToFitContent(true);
    this.composerHasOverflow = textarea.scrollHeight > textarea.clientHeight;
  }
}
