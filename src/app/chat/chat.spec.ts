import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
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
    component = fixture.componentInstance;
  });

  async function renderChat(messages: Message[] = []): Promise<Chat> {
    const chat = new Chat(1, 'Test Chat', 'Online', 'TC', new Supporter());
    chat.messages.push(...messages);
    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return chat;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
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

    const image = fixture.nativeElement.querySelector('.message-markdown img') as HTMLImageElement | null;
    expect(image?.getAttribute('src')).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg',
    );
    expect(image?.getAttribute('alt')).toBe('A mushroom-head robot drinking bubble tea');
  });
});
