import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';
import { UiPreferencesService } from '../../services/ui-preferences.service';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;
  let uiPreferences: UiPreferencesService;

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
    uiPreferences = TestBed.inject(UiPreferencesService);
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

  it('keeps user messages as raw text when the markdown toggle is disabled', async () => {
    await renderChat([new Message('**bold**', 'user')]);

    const text = fixture.nativeElement.querySelector('.message-text') as HTMLElement | null;
    expect(text?.textContent).toContain('**bold**');
    expect(fixture.nativeElement.querySelector('.message-markdown')).toBeNull();
  });

  it('renders user messages as markdown when the markdown toggle is enabled', async () => {
    uiPreferences.setRenderUserMarkdown(true);
    await renderChat([new Message('**bold**', 'user')]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
  });
});
