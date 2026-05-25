import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideHttpClient(),
        provideMarkdown({
          markedOptions: {
            provide: MARKED_OPTIONS,
            useValue: {
              gfm: true,
              breaks: true,
            },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
  });

  async function renderChat(draftMessage: string | Message[] = ''): Promise<Chat> {
    const supporter = new Supporter();
    const chat = new Chat('test-chat-id', 'Test Chat', 'Online', 'TC', supporter);
    supporter.setAgent(new Agent(TestBed.inject(Injector)));
    if (typeof draftMessage === 'string') {
      chat.draftMessage = draftMessage;
    } else {
      chat.messages = draftMessage;
    }

    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();

    return chat;
  }

  it('renders a textarea composer with a max of 5 rows', async () => {
    await renderChat();

    const textarea = fixture.nativeElement.querySelector('#message-input') as HTMLTextAreaElement;

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.style.getPropertyValue('--composer-max-rows')).toBe('5');
  });

  it('sends the message on Enter', async () => {
    const chat = await renderChat('Hello from Enter');
    const textarea = fixture.nativeElement.querySelector('#message-input') as HTMLTextAreaElement;
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    textarea.dispatchEvent(enterEvent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0].value).toBe('Hello from Enter');
    expect(chat.draftMessage).toBe('');
  });

  it('renders AI messages as markdown', async () => {
    const message = new Message('**bold** and *italic*');
    message.from = 'supporter';
    await renderChat([message]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
    expect(bubble?.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders user messages through the message bubble markdown view', async () => {
    const message = new Message('**bold**');
    message.from = 'client';
    await renderChat([message]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders markdown files as img elements', async () => {
    const message = new Message(
      '![A mushroom-head robot drinking bubble tea](https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg)',
    );
    message.from = 'supporter';
    await renderChat([
      message,
    ]);

    const file = fixture.nativeElement.querySelector(
      '.message-markdown img',
    ) as HTMLFileElement | null;
    expect(file?.getAttribute('src')).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg',
    );
    expect(file?.getAttribute('alt')).toBe('A mushroom-head robot drinking bubble tea');
  });
});
