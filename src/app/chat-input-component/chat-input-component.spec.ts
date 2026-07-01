import { Component, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { DefaultManager } from '../../chat-managers/DefaultManager';
import { ChatProvider } from '../../interfaces/ChatProvider';
import { Uuid } from '../../interfaces/db/Uuid';
import { REGISTERED_AGENTS } from '../../services/agents.module';
import { ChatInputComponent } from './chat-input-component';

@Component({ template: '' })
class TestAuthenticationComponent {}

const chatProviderStub: ChatProvider = {
  metadata: {
    id: 'test',
    displayName: 'Test',
    description: 'Test chat provider',
    authenticationComponent: TestAuthenticationComponent,
  },
  authentication: {
    loggedIn: true,
    register: async () => ({ id: 'test-user', email: 'test@example.com' }),
    login: async () => ({ id: 'test-user', email: 'test@example.com' }),
    logout: async () => {},
    getCurrentUser: async () => ({ id: 'test-user', email: 'test@example.com' }),
  },
  createChat: () => {
    throw new Error('Not implemented');
  },
  addMessage: () => {},
  deleteMessage: () => {},
  editMessage: () => {},
  getChats: () => [],
  deleteChat: () => {},
};

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;
  let chat: Chat;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatInputComponent],
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

    fixture = TestBed.createComponent(ChatInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits a trimmed message on submit', () => {
    const emittedMessages: string[] = [];
    component.caption = '  hello world  ';
    component.messageSubmit.subscribe((message) => emittedMessages.push(message));

    component.submitMessage();

    expect(emittedMessages).toEqual(['hello world']);
  });
});
