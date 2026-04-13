import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';
import { Message } from '../../classes/Message';

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
  });

  async function renderChat(draftMessage: string | Message[] = ''): Promise<Chat> {
    const chat = new Chat(1, 'Test Chat', 'Online', 'TC', new Supporter());
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
    expect(fixture.componentInstance.composerMaxRows).toBe(5);
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
    await renderChat([new Message('**bold** and *italic*', 'supporter')]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
    expect(bubble?.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders user messages through the message bubble markdown view', async () => {
    await renderChat([new Message('**bold**', 'user')]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders markdown images as img elements', async () => {
    await renderChat([
      new Message(
        '![A mushroom-head robot drinking bubble tea](https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg)',
        'supporter',
      ),
    ]);

    const image = fixture.nativeElement.querySelector(
      '.message-markdown img',
    ) as HTMLImageElement | null;
    expect(image?.getAttribute('src')).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg',
    );
    expect(image?.getAttribute('alt')).toBe('A mushroom-head robot drinking bubble tea');
  });
});
