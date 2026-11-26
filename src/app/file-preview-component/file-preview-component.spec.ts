import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageOptions } from '../../classes/Message';

import { FilePreviewComponent } from './file-preview-component';

describe('FilePreviewComponent', () => {
  let component: FilePreviewComponent;
  let fixture: ComponentFixture<FilePreviewComponent>;
  const savedPath = 'attachments/test-chat/first-file';
  const saveFile = vi.fn<(file: File) => Promise<string>>();
  const cancelFile = vi.fn<(filePath: string | undefined) => Promise<void>>();

  beforeEach(async () => {
    saveFile.mockReset().mockResolvedValue(savedPath);
    cancelFile.mockReset().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [FilePreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'file',
      new File(['fresh slice'], 'fresh-slice.png', { type: 'image/png' }),
    );
    fixture.componentRef.setInput('onFileSelected', saveFile);
    fixture.componentRef.setInput('onFileCanceled', cancelFile);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(saveFile).toHaveBeenCalledWith(component.file());
    expect(component.fileInfo()?.url).toBe(savedPath);
  });

  it('submits the caption and clears the preview composer', () => {
    const submitted: { value: string; options?: MessageOptions }[] = [];
    component.submitted.subscribe((message) => submitted.push(message));

    component.submitFile('Fresh slice');

    expect(submitted[0].value).toBe('Fresh slice');
    expect(submitted[0].options?.attachment).toEqual(component.fileInfo());
    expect(component.caption()).toBe('');
  });

  it('waits for the replacement file to be saved before allowing submission', async () => {
    let finishSaving!: (filePath: string) => void;
    saveFile.mockReturnValueOnce(new Promise<string>((resolve) => {
      finishSaving = resolve;
    }));
    const replacement = new File(['replacement'], 'replacement.txt', { type: 'text/plain' });
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);

    await component.changeFile(replacement);
    fixture.detectChanges();

    expect(cancelFile).toHaveBeenCalledExactlyOnceWith(savedPath);
    expect(saveFile).toHaveBeenLastCalledWith(replacement);
    const submitButton = fixture.nativeElement.querySelector('.send-button') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    submitButton.click();
    expect(submitted).not.toHaveBeenCalled();

    const replacementPath = 'attachments/test-chat/replacement-file';
    finishSaving(replacementPath);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(submitButton.disabled).toBe(false);
    submitButton.click();
    expect(submitted).toHaveBeenCalledWith({
      value: '',
      options: {
        attachment: {
          name: 'replacement', extension: 'txt', type: 'text/plain',
          size: replacement.size, url: replacementPath,
        },
      },
    });
  });
});
