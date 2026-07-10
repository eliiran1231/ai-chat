import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MARKED_OPTIONS, provideMarkdown, SANITIZE } from 'ngx-markdown';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { MessageStatus } from '../../enums/MessagesStatus';
import { Uuid } from '../../interfaces/db/Uuid';
import { createChatManagerStub } from '../../testing/chat-manager.stub';
import { sanitizeMarkdown } from '../../utils/sanitize-markdown';
import { ChatComponent } from './chat-component';

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideHttpClient(),
        provideMarkdown({
          sanitize: {
            provide: SANITIZE,
            useValue: sanitizeMarkdown,
          },
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
    const supporter = new Supporter('test-supporter-id' as Uuid);
    const chat = new Chat(
      'test-chat-id' as Uuid,
      'Test Chat',
      supporter,
      createChatManagerStub(),
      { status: 'Online', avatar: { type: 'text', value: 'TC' } },
    );
    if (typeof draftMessage === 'string') {
      chat.draftMessage.set(draftMessage);
    } else {
      chat.messages.set(draftMessage);
    }

    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return chat;
  }

  function createMessage(id: string, value: string, time: Date, from: 'client' | 'supporter' = 'client'): Message {
    return new Message(value, { id: id as Uuid, time, from });
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

    expect(chat.messages()).toHaveLength(1);
    expect(chat.messages()[0].value()).toBe('Hello from Enter');
    expect(chat.draftMessage()).toBe('');
  });

  it('renders AI messages as markdown', async () => {
    const message = new Message('**bold** and *italic*');
    message.from.set('supporter');
    await renderChat([message]);

    await vi.waitFor(() => {
      const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;

      expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
      expect(bubble?.querySelector('em')?.textContent).toBe('italic');
    });
  });

  it('renders agent activity separately and exposes Stop without adding a response message', async () => {
    const chat = await renderChat();
    const cancelResponse = vi
      .spyOn(chat.supporter, 'cancelResponse')
      .mockResolvedValue(undefined);
    chat.supporter.actions.set(['Using get_sync_status...']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('#message-input') as HTMLTextAreaElement;
    const stop = fixture.nativeElement.querySelector('[aria-label="Stop response"]') as HTMLButtonElement;

    await vi.waitFor(() => {
      const activity = fixture.nativeElement.querySelector('.agent-run-status') as HTMLElement;
      expect(activity.textContent?.trim()).toBe('Using get_sync_status...');
    });
    expect(textarea.disabled).toBe(true);
    expect(chat.messages()).toHaveLength(0);

    stop.click();
    expect(cancelResponse).toHaveBeenCalled();
  });

  it('retries a failed supporter response by deleting it and responding again', async () => {
    const clientMessage = createMessage('client-message', 'Try this', new Date(), 'client');
    const failedResponse = new Message('Nope', {
      id: 'failed-response' as Uuid,
      from: 'supporter',
      status: MessageStatus.Failed,
    });
    const chat = await renderChat([clientMessage, failedResponse]);
    chat.messages().forEach((message) => message.setChat(chat));
    const respond = vi
      .spyOn(chat.supporter, 'respond')
      .mockResolvedValue(undefined);

    await fixture.componentInstance.retryMessage(failedResponse);

    expect(chat.messages()).toEqual([clientMessage]);
    expect(respond).toHaveBeenCalledOnce();
  });

  it('renders user messages through the message bubble markdown view', async () => {
    const message = new Message('**bold**');
    message.from.set('client');
    await renderChat([message]);

    await vi.waitFor(() => {
      const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;

      expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
    });
  });

  it('renders markdown files as img elements', async () => {
    const message = new Message(
      '![A mushroom-head robot drinking bubble tea](https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg)',
    );
    message.from.set('supporter');
    await renderChat([
      message,
    ]);

    await vi.waitFor(() => {
      const file = fixture.nativeElement.querySelector(
        '.message-markdown img',
      ) as HTMLImageElement | null;

      expect(file?.getAttribute('src')).toBe(
        'https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg',
      );
      expect(file?.getAttribute('alt')).toBe('A mushroom-head robot drinking bubble tea');
    });
  });

  it('renders one date separator per message day', async () => {
    await renderChat([
      createMessage('first', 'First', new Date(2026, 5, 15, 9)),
      createMessage('second', 'Second', new Date(2026, 5, 15, 10)),
      createMessage('third', 'Third', new Date(2026, 5, 16, 9)),
    ]);

    const separators = fixture.nativeElement.querySelectorAll('.date-separator time');

    expect(separators).toHaveLength(2);
    expect(separators[0].textContent.trim()).toBe('Jun 15, 2026');
    expect(separators[0].getAttribute('datetime')).toBe('2026-06-15');
  });

  it('starts a new bubble group when the date changes', async () => {
    await renderChat([
      createMessage('first', 'First', new Date(2026, 5, 15, 9)),
      createMessage('second', 'Second', new Date(2026, 5, 16, 9)),
    ]);
    const bubbles = fixture.nativeElement.querySelectorAll('.message-bubble');

    expect(bubbles[1].classList.contains('message-bubble--with-tail')).toBe(true);
  });
});
