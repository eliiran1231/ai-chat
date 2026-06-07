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
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() chat: Chat | undefined;
  @Input() requiredContent = true;
  @Input() placeholder = 'Type a message';
  @Input() allowAttachments = true;
  @Output() messageSubmit = new EventEmitter<string>();
  @Output() fileSubmit = new EventEmitter<File>();
  @Input() caption = '';

  submitMessage(form?: NgForm): void {
    const trimmedMessage = this.caption.trim();
    (!this.requiredContent || trimmedMessage) && this.messageSubmit.emit(trimmedMessage);
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
    if(this.chat) this.chat.draftMessage = this.caption; 
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    autosize.resizeToFitContent(true);
    this.composerHasOverflow = textarea.scrollHeight > textarea.clientHeight;
  }
}
