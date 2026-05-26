import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    const file = new File(['Fresh slice'], 'fresh-slice.txt', { type: 'text/plain' });
    fixture.componentRef.setInput('file', file);
    fixture.componentRef.setInput('processFileUrl', () => 'blob:fresh-slice');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits a trimmed caption and clears the input', () => {
    const submitted: string[] = [];
    component.caption = '  Fresh slice  ';
    component.submitted.subscribe((message) => submitted.push(message.value));

    component.submitFile(component.caption.trim());

    expect(submitted).toEqual(['Fresh slice']);
    expect(component.caption).toBe('');
  });
});
