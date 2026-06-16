import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, MessageOptions } from '../../classes/Message';
import { NgxFilesizeModule } from 'ngx-filesize';
import { ChatInputComponent } from "../chat-input-component/chat-input-component";
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-file-preview-component',
  imports: [FormsModule, NgxFilesizeModule, ChatInputComponent, TranslatePipe],
  templateUrl: './file-preview-component.html',
  styleUrl: './file-preview-component.scss',
})
export class FilePreviewComponent implements OnInit {
  @Input({ required: true }) file!: File;
  @Input() fileAlt?: string; 
  @Input({ required: true }) processFileUrl!: (file: File) => string | Promise<string>;
  processedFileUrl = signal('');
  fileInfo!: Attachment; 

  async ngOnInit(){
    this.fileAlt = this.fileAlt ?? this.file.name;
    const dotIndex = this.file.name.lastIndexOf('.');
    const [name, extension] = [this.file.name.slice(0,dotIndex), this.file.name.slice(dotIndex+1)];
    this.fileInfo = { extension, name, url: this.processedFileUrl(), size: this.file.size, type: this.file.type };
    let processedFileUrl = this.processFileUrl(this.file);
    if(typeof processedFileUrl != "string") processedFileUrl = await processedFileUrl;
    this.fileInfo.url = processedFileUrl;
    this.processedFileUrl.set(processedFileUrl)
  }

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<{value: string, options?: MessageOptions}>();

  caption = '';

  closePreview(): void {
    this.closed.emit();
  }

  submitFile(message: string): void {
    this.submitted.emit({ value: message, options: { attachment: this.fileInfo } });
    this.caption = '';
  }

  changeFile(newFile: File){
    this.file = newFile;
    this.ngOnInit()
  }
}
