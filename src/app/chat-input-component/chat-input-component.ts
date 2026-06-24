import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { LucideDynamicIcon, LucidePaperclip, LucideSendHorizontal } from '@lucide/angular';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-input-component',
  imports: [FormsModule, TextFieldModule, LucideDynamicIcon],
  templateUrl: './chat-input-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat-input-component.scss',
})
export class ChatInputComponent {
  readonly composerMaxRows = 5;
  readonly attachIcon = LucidePaperclip;
  readonly sendIcon = LucideSendHorizontal;
  composerHasOverflow = signal(false);
  theme = input<'light' | 'dark'>('light');
  chat = input<Chat | undefined>(undefined);
  requiredContent = input(true);
  placeholder = input('Type a message');
  allowAttachments = input(true);
  messageSubmit = output<string>();
  fileSubmit = output<File>();
  caption = model('');

  submitMessage(form?: NgForm): void {
    const trimmedMessage = this.caption().trim();
    (!this.requiredContent() || trimmedMessage) && this.messageSubmit.emit(trimmedMessage);
    this.composerHasOverflow.set(false);
    form?.resetForm({ message: '' });
    this.caption.set('');
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

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    this.caption.set(textarea.value);
    autosize.resizeToFitContent(true);
    this.composerHasOverflow.set(textarea.scrollHeight > textarea.clientHeight);
  }
}
