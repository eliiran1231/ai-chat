import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment, MessageOptions } from '../../classes/Message';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { FilesizePipe } from '../../pipes/filesize.pipe';
import { TranslatePipe } from '../shared/translate.pipe';
import { FileSelectionResult, savedFile } from '../../classes/Chat';
import { SavedChatFile } from '../../services/fileExplorer.service';

@Component({
  selector: 'app-file-preview-component',
  imports: [FormsModule, FilesizePipe, ChatInputComponent, TranslatePipe],
  templateUrl: './file-preview-component.html',
  styleUrl: './file-preview-component.scss',
})
export class FilePreviewComponent {
  file = input.required<File>();
  fileAlt = input<string | undefined>(undefined);
  onFileSelected = input.required<(file: File) => Promise<FileSelectionResult>>();
  onFileCanceled = input.required<(fileId: string | undefined) => Promise<void>>();
  initialCaption = input('');
  previewFile = signal<File | undefined>(undefined);
  currentFile = computed(() => this.previewFile() ?? this.file());
  previewFailed = signal(false);
  processedFileUrl = signal('');
  fileInfo = signal<Attachment | undefined>(undefined);
  caption = signal('');
  resolvedFileAlt = computed(() => this.fileAlt() ?? this.currentFile().name);

  constructor() {
    this.caption.set(this.initialCaption());
    effect(async () => {
      const file: File = this.currentFile();
      const onFileSelected = this.onFileSelected();
      this.processedFileUrl.set('');
      const dotIndex = file.name.lastIndexOf('.');
      const name = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name;
      const extension = dotIndex >= 0 ? file.name.slice(dotIndex + 1) : '';
      const initialInfo = { extension, name, url: '', size: file.size, type: file.type };
      this.fileInfo.set(initialInfo);
      try {
        const fileSelectionResult = await onFileSelected(file);
        this.processedFileUrl.set(fileSelectionResult.savedChatFile?.pathFile ?? '');
        this.fileInfo.set({
          ...initialInfo,
          url: this.processedFileUrl(),
          fileId: fileSelectionResult.savedChatFile?.id,
        });
      } catch (error) {
        this.previewFailed.set(true);
        console.error(error);
      }
    });
  }

  closed = output<void>();
  submitted = output<{ value: string; options?: MessageOptions }>();

  closePreview(): void {
    this.closed.emit();
  }

  submitFile(message: string): void {
    const attachment = this.fileInfo();
    this.submitted.emit({ value: message, options: attachment ? { attachment } : undefined });
    this.caption.set('');
  }

  async changeFile(newFile: File): Promise<void> {
    await this.onFileCanceled()(this.fileInfo()?.fileId);
    this.previewFile.set(newFile);
  }
}
