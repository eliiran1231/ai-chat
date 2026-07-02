import { Component, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { DefaultManager } from '../../chat-managers/DefaultManager';
import { ChatProvider } from '../../interfaces/ChatProvider';
import { Uuid } from '../../interfaces/db/Uuid';
import { MessageOptions } from '../../classes/Message';
import { REGISTERED_AGENTS } from '../../services/agents.module';

import { FilePreviewComponent } from './file-preview-component';

@Component({ template: '' })
class TestAuthenticationComponent {}

const chatProviderStub: ChatProvider = {
  metadata: {
    id: 'test',
    displayName: 'Test',
    description: 'Test chat provider',
    avatarUrl: 'test-provider.png',
    authenticationComponent: TestAuthenticationComponent,
  },
  authentication: {
    loggedIn: (() => true) as any,
    register: async () => ({ id: 'test-user', email: 'test@example.com' }),
    login: async () => ({ id: 'test-user', email: 'test@example.com' }),
    logout: async () => {},
    getCurrentUser: async () => ({ id: 'test-user', email: 'test@example.com' }),
  } as any,
  createChat: () => {
    throw new Error('Not implemented');
  },
  addMessage: () => {},
  deleteMessage: () => {},
  editMessage: () => {},
  getChats: () => [],
  deleteChat: () => {},
};

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

    const supporter = new Supporter('test-supporter-id' as Uuid);
    chat = new Chat(
      'test-chat-id' as Uuid,
      'Test Chat',
      supporter,
      new DefaultManager(TestBed.inject(Injector), chatProviderStub),
      { status: 'Online', avatar: { type: 'text', value: 'TC' } },
    );

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
    expect(chat.draftMessage()).toBe('');
    expect(component.caption()).toBe('');
  });
});
