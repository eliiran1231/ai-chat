import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from '../../classes/Message';

@Component({
  selector: 'app-file-preview-component',
  imports: [FormsModule],
  templateUrl: './file-preview-component.html',
  styleUrl: './file-preview-component.scss',
})
export class FilePreviewComponent implements OnInit {
  @Input({ required: true }) file!: File;
  @Input() fileAlt?: string; 
  @Input({ required: true }) processFileUrl!: (file: File) => string | Promise<string>;
  processedFileUrl = signal('');

  async ngOnInit(){
    this.fileAlt = this.fileAlt ?? this.file.name;
    const processedFileUrl = this.processFileUrl(this.file);
    if(typeof processedFileUrl == "string") this.processedFileUrl.set(processedFileUrl);
    else this.processedFileUrl.set(await processedFileUrl)
  }

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<Message>();

  caption = '';

  closePreview(): void {
    this.closed.emit();
  }

  submitFile(): void {
    const message = this.caption.trim();
    this.submitted.emit(new Message(message, {
      type: this.file.type, 
      url: this.processedFileUrl()
    }));
    this.caption = '';
  }
}
