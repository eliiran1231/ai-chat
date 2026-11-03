import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageOptions } from '../../classes/Message';

import { FilePreviewComponent } from './file-preview-component';

describe('FilePreviewComponent', () => {
  let component: FilePreviewComponent;
  let fixture: ComponentFixture<FilePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'file',
      new File(['fresh slice'], 'fresh-slice.png', { type: 'image/png' }),
    );
    fixture.componentRef.setInput('processFileUrl', () => 'blob:fresh-slice');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits the caption and clears the preview composer', () => {
    const submitted: { value: string; options?: MessageOptions }[] = [];
    component.submitted.subscribe((message) => submitted.push(message));

    component.submitFile('Fresh slice');

    expect(submitted[0].value).toBe('Fresh slice');
    expect(submitted[0].options?.attachment).toEqual(component.fileInfo());
    expect(component.caption()).toBe('');
  });

  it('releases a cancelled preview, including a URL produced after destruction', async () => {
    const release = vi.fn();
    let finish!: (url: string) => void;
    fixture.componentRef.setInput('releaseFileUrl', release);
    fixture.componentRef.setInput('processFileUrl', () => new Promise<string>(resolve => { finish = resolve; }));
    fixture.detectChanges();
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.submitFile('too soon');
    expect(submitted).not.toHaveBeenCalled();
    fixture.destroy();
    finish('blob:late');
    await Promise.resolve();
    expect(release).toHaveBeenCalledWith('blob:late');
  });

  it('keeps a submitted URL alive for saving the message', async () => {
    const release = vi.fn();
    fixture.componentRef.setInput('releaseFileUrl', release);
    fixture.detectChanges();
    await fixture.whenStable();
    component.submitFile('caption');
    fixture.destroy();
    expect(release).not.toHaveBeenCalledWith('blob:fresh-slice');
  });

  it('keeps the newest selection when an older preparation finishes late', async () => {
    let finishOld!: (url: string) => void;
    const release = vi.fn();
    fixture.componentRef.setInput('releaseFileUrl', release);
    fixture.componentRef.setInput('processFileUrl', (file: File) => file.name === 'new.png'
      ? 'blob:new' : new Promise<string>(resolve => { finishOld = resolve; }));
    fixture.detectChanges();
    component.changeFile(new File(['new'], 'new.png', { type: 'image/png' }));
    fixture.detectChanges();
    await fixture.whenStable();
    finishOld('blob:old');
    await fixture.whenStable();
    expect(component.fileInfo()?.url).toBe('blob:new');
    expect(release).toHaveBeenCalledWith('blob:old');
  });
});
