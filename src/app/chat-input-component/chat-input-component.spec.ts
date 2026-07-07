import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatInputComponent } from './chat-input-component';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let fixture: ComponentFixture<ChatInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits a trimmed message on submit', () => {
    const emittedMessages: string[] = [];
    component.caption.set('  hello world  ');
    component.messageSubmit.subscribe((message) => emittedMessages.push(message));

    component.submitMessage();

    expect(emittedMessages).toEqual(['hello world']);
  });
});
