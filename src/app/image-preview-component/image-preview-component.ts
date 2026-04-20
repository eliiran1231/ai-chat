import { Component, effect, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Input() imageAlt = this.image.name;
  @Input({ required: true }) proccessImageUrl!: (file: File) => string | Promise<string>;
  preccessedImageUrl!: string;

  async ngOnInit(){
    const preccessedImageUrl = this.proccessImageUrl(this.image);
    this.preccessedImageUrl = typeof preccessedImageUrl == "string" ?
     preccessedImageUrl : 
     await preccessedImageUrl 
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
      url: this.preccessedImageUrl
    }));
    this.caption = '';
  }
}
