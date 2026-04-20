import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '../../classes/Message';

@Component({
  selector: 'app-image-preview-component',
  imports: [FormsModule],
  templateUrl: './image-preview-component.html',
  styleUrl: './image-preview-component.scss',
})
export class ImagePreviewComponent implements OnInit {
  @Input({ required: true }) image!: File;
  @Input() imageAlt?: string; 
  @Input({ required: true }) processImageUrl!: (file: File) => string | Promise<string>;
  processedImageUrl = signal('');

  async ngOnInit(){
    this.imageAlt = this.imageAlt ?? this.image.name;
    const processedImageUrl = this.processImageUrl(this.image);
    if(typeof processedImageUrl == "string") this.processedImageUrl.set(processedImageUrl);
    else this.processedImageUrl.set(await processedImageUrl)
  }

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<Message>();

  caption = '';

  closePreview(): void {
    this.closed.emit();
  }

  submitImage(): void {
    const message = this.caption.trim();
    this.submitted.emit(new Message(message, {
      type: 'image', 
      url: this.processedImageUrl()
    }));
    this.caption = '';
  }
}
