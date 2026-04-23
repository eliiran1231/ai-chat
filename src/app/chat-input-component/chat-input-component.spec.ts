import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { ChatInputComponent } from './chat-input-component';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;
  let chat: Chat;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatInputComponent],
    }).compileComponents();

    const supporter = new Supporter();
    chat = new Chat(1, 'Test Chat', 'Online', 'TC', supporter);
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

  it('emits a trimmed message and clears the draft on submit', () => {
    const emittedMessages: string[] = [];
    chat.draftMessage = '  hello world  ';
    component.messageSubmit.subscribe((message) => emittedMessages.push(message));

    component.submitMessage();

    expect(emittedMessages).toEqual(['hello world']);
    expect(chat.draftMessage).toBe('');
  });
});
