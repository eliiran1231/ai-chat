import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-input-component',
  imports: [FormsModule, TextFieldModule],
  templateUrl: './chat-input-component.html',
  styleUrl: './chat-input-component.scss',
})
export class 
ChatInputComponent {
  readonly composerMaxRows = 5;
  composerHasOverflow = false;

  @Input({ required: true }) chat!: Chat;
  @Output() messageSubmit = new EventEmitter<string>();
  @Output() imageSubmit = new EventEmitter<File>();

  submitMessage(form?: NgForm): void {
    const trimmedMessage = this.chat.draftMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    this.messageSubmit.emit(trimmedMessage);
    this.chat.draftMessage = '';
    this.composerHasOverflow = false;
    form?.resetForm({ message: '' });
  }

  pickImage(): void {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          console.log(file);
          this.imageSubmit.emit(file);
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

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    autosize.resizeToFitContent(true);
    this.composerHasOverflow = textarea.scrollHeight > textarea.clientHeight;
  }
}
