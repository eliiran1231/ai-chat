import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-image-preview-component',
  imports: [FormsModule],
  templateUrl: './image-preview-component.html',
  styleUrl: './image-preview-component.scss',
})
export class ImagePreviewComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() imageUrl =
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Pizza-3007395.jpg/1920px-Pizza-3007395.jpg';
  @Input() imageAlt = 'Preview image';

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<string>();

  caption = '';

  closePreview(): void {
    this.closed.emit();
  }

  submitCaption(): void {
    const message = this.caption.trim();

    if (!message) {
      return;
    }

    this.chat.draftMessage = message;
    this.submitted.emit(message);
    this.caption = '';
  }
}
