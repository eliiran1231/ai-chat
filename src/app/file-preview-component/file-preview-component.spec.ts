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
});
