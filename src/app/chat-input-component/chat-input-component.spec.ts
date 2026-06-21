import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { REGISTERED_AGENTS } from '../../services/agents.module';
import { ChatInputComponent } from './chat-input-component';

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

    const supporter = new Supporter();
    chat = new Chat(
      'test-chat-id',
      'Test Chat',
      'Online',
      { type: 'text', value: 'TC' },
      supporter,
    );
    supporter.setAgent(new Agent(TestBed.inject(Injector)));

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
