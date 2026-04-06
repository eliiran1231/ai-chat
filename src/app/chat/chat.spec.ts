import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let fixture: ComponentFixture<ChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
  });

  function createChat(): Chat {
    const chat = new Chat(1, 'Test Chat', 'Online', 'TC', new Supporter());
    vi.spyOn(chat.supporter, 'respond').mockResolvedValue(undefined);
    return chat;
  }

  function getComposer(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('#message-input') as HTMLTextAreaElement;
  }

  function installTextareaMetrics(textarea: HTMLTextAreaElement): void {
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => {
        const lines = textarea.value ? textarea.value.split('\n').length : 1;
        return 18 + lines * 22;
      },
    });
  }

  async function renderChat(draftMessage = ''): Promise<Chat> {
    const chat = createChat();
    chat.draftMessage = draftMessage;

    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    installTextareaMetrics(getComposer());
    getComposer().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return chat;
  }

  async function updateDraft(text: string): Promise<void> {
    const textarea = getComposer();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await renderChat();

    expect(component).toBeTruthy();
  });

  it('renders the composer as a single-line textarea by default', async () => {
    await renderChat();

    const textarea = getComposer();

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.getAttribute('rows')).toBe('1');
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('grows up to four lines and scrolls internally after that', async () => {
    await renderChat();

    const textarea = getComposer();

    await updateDraft('1\n2\n3\n4');
    const heightAtFourLines = Number.parseFloat(textarea.style.height);

    await updateDraft('1\n2\n3\n4\n5');
    const heightAtFiveLines = Number.parseFloat(textarea.style.height);

    expect(textarea.style.overflowY).toBe('auto');
    expect(heightAtFiveLines).toBeCloseTo(heightAtFourLines, 0);
  });

  it('sends the message on Enter and resets the composer height', async () => {
    const chat = await renderChat();

    const textarea = getComposer();
    await updateDraft('1\n2\n3\n4\n5');
    const expandedHeight = Number.parseFloat(textarea.style.height);

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');

    textarea.dispatchEvent(enterEvent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0].value).toBe('1\n2\n3\n4\n5');
    expect(chat.draftMessage).toBe('');
    expect(textarea.value).toBe('');
    expect(Number.parseFloat(textarea.style.height)).toBeLessThan(expandedHeight);
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('keeps Enter available for a new line when Shift is pressed', async () => {
    const chat = await renderChat();

    const textarea = getComposer();
    await updateDraft('Draft message');

    const shiftEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(shiftEnterEvent, 'preventDefault');

    textarea.dispatchEvent(shiftEnterEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(chat.messages).toHaveLength(0);
    expect(chat.draftMessage).toBe('Draft message');
  });
});
