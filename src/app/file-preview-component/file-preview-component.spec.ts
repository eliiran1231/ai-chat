import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { MessageOptions } from '../../classes/Message';
import { REGISTERED_AGENTS } from '../../services/agents.module';

import { FilePreviewComponent } from './file-preview-component';

describe('FilePreviewComponent', () => {
  let component: FilePreviewComponent;
  let fixture: ComponentFixture<FilePreviewComponent>;
  let chat: Chat;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewComponent],
      providers: [
        {
          provide: REGISTERED_AGENTS,
          useValue: {},
        },
      ],
    }).compileComponents();

    const supporter = new Supporter();
    chat = new Chat(
      'test-chat-id',
      'Test Chat',
      'Online',
      { type: 'text', value: 'TC' },
      supporter,
    );
    supporter.setAgent(new Agent(TestBed.inject(Injector)));

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

  it('submits a trimmed caption and syncs the chat draft', () => {
    const submitted: { value: string; options?: MessageOptions }[] = [];
    component.submitted.subscribe((message) => submitted.push(message));

    component.submitFile('Fresh slice');

    expect(submitted[0].value).toBe('Fresh slice');
    expect(submitted[0].options?.attachment).toEqual(component.fileInfo);
    expect(chat.draftMessage).toBe('');
    expect(component.caption).toBe('');
  });
});
