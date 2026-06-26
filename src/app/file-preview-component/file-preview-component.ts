import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, MessageOptions } from '../../classes/Message';
import { ChatInputComponent } from "../chat-input-component/chat-input-component";
import { FilesizePipe } from '../../pipes/filesize.pipe';

@Component({
  selector: 'app-file-preview-component',
  imports: [FormsModule, FilesizePipe, ChatInputComponent],
  templateUrl: './file-preview-component.html',
  styleUrl: './file-preview-component.scss',
})
export class FilePreviewComponent {
  file = input.required<File>();
  fileAlt = input<string | undefined>(undefined);
  processFileUrl = input.required<(file: File) => string | Promise<string>>();
  previewFile = signal<File | undefined>(undefined);
  currentFile = computed(() => this.previewFile() ?? this.file());
  processedFileUrl = signal('');
  fileInfo = signal<Attachment | undefined>(undefined);
  caption = signal('');
  resolvedFileAlt = computed(() => this.fileAlt() ?? this.currentFile().name);

  constructor() {
    effect(async () => {
      const file = this.currentFile();
      const processFileUrl = this.processFileUrl();
      this.processedFileUrl.set('');
      const dotIndex = file.name.lastIndexOf('.');
      const name = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name;
      const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1) : '';
      const initialInfo = { extension, name, url: '', size: file.size, type: file.type };
      this.fileInfo.set(initialInfo);
      const processedFileUrl = await processFileUrl(file);
      this.processedFileUrl.set(processedFileUrl);
      this.fileInfo.set({ ...initialInfo, url: processedFileUrl });
    });
  }

  closed = output<void>();
  submitted = output<{value: string, options?: MessageOptions}>();

  closePreview(): void {
    this.closed.emit();
  }

  submitFile(message: string): void {
    const attachment = this.fileInfo();
    this.submitted.emit({ value: message, options: attachment ? { attachment } : undefined });
    this.caption.set('');
  }

  changeFile(newFile: File): void {
    this.previewFile.set(newFile);
  }
}
