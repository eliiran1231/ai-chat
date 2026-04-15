import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { ChatComponent } from './chat-component';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn((target: Element) => {
    this.target = target;
  });
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();
  readonly takeRecords = vi.fn(() => []);
  private target: Element | null = null;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }

  emit(isIntersecting: boolean) {
    if (!this.target) {
      throw new Error('IntersectionObserver target was not observed');
    }

    this.callback(
      [
        {
          isIntersecting,
          target: this.target,
          intersectionRatio: isIntersecting ? 1 : 0,
          time: 0,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
        },
      ] as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;

  function mockAnimationFrameAsync() {
    return vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        return setTimeout(() => callback(0), 0) as unknown as number;
      });
  }

  async function waitForAnimationFrame(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function updateBottomSentinelVisibility(isIntersecting: boolean): Promise<void> {
    let observer = MockIntersectionObserver.instances.find(
      (instance) => instance.options?.rootMargin === '0px 0px 160px 0px',
    );

    if (!observer) {
      await waitForAnimationFrame();
      observer = MockIntersectionObserver.instances.find(
        (instance) => instance.options?.rootMargin === '0px 0px 160px 0px',
      );
    }

    if (!observer) {
      throw new Error('IntersectionObserver was not created');
    }

    observer.emit(isIntersecting);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

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
    const chat = new Chat(1, 'Test Chat', 'Online', 'TC', supporter);
    supporter.setAgent(new Agent());
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
    await renderChat([new Message('**bold** and *italic*')]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
    expect(bubble?.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders user messages through the message bubble markdown view', async () => {
    await renderChat([new Message('**bold**')]);

    const bubble = fixture.nativeElement.querySelector('.message-markdown') as HTMLElement | null;
    expect(bubble?.querySelector('strong')?.textContent).toBe('bold');
  });

  it('renders markdown images as img elements', async () => {
    await renderChat([
      new Message(
        '![A mushroom-head robot drinking bubble tea](https://upload.wikimedia.org/wikipedia/commons/9/91/Pizza-3007395.jpg)'
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

  it('keeps the DOM message order chronological', async () => {
    await renderChat([new Message('first'), new Message('second')]);

    const renderedMessages = Array.from(
      fixture.nativeElement.querySelectorAll('.message-markdown'),
    ) as HTMLElement[];

    expect(renderedMessages.map((element) => element.textContent?.trim())).toEqual([
      'first',
      'second',
    ]);
  });

  it('scrolls to the bottom when opening a chat with messages', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    let scrollTopValue = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 480,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    await renderChat([new Message('existing')]);
    await waitForAnimationFrame();

    expect(scrollTopValue).toBe(480);
    requestAnimationFrameSpy.mockRestore();
  });

  it('creates the bottom observer with a 10rem bottom offset', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();
    await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await waitForAnimationFrame();

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer?.options?.rootMargin).toBe('0px 0px 160px 0px');
    requestAnimationFrameSpy.mockRestore();
  });

  it('keeps the scroll-to-bottom button hidden on first open before the observer settles', async () => {
    await renderChat([new Message('existing')]);

    expect(fixture.nativeElement.querySelector('.scroll-to-bottom-button')).toBeNull();
  });

  it('shows the scroll-to-bottom button whenever the bottom sentinel is no longer visible', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();
    await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await updateBottomSentinelVisibility(false);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.scroll-to-bottom-button')).not.toBeNull();
    requestAnimationFrameSpy.mockRestore();
  });

  it('scrolls to the bottom when sending a message', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    const chat = await renderChat('Hello from Enter');
    let scrollTopValue = 120;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const textarea = fixture.nativeElement.querySelector('#message-input') as HTMLTextAreaElement;
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForAnimationFrame();

    expect(chat.messages.at(-1)?.value).toBe('Hello from Enter');
    expect(scrollTopValue).toBe(640);
    requestAnimationFrameSpy.mockRestore();
  });

  it('scrolls to the bottom when a supporter message arrives and the user is already at the bottom', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    let scrollHeightValue = 480;
    let scrollTopValue = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeightValue,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const chat = await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await updateBottomSentinelVisibility(true);

    scrollHeightValue = 520;
    chat.supporter.sendMessage('incoming');
    await Promise.resolve();
    await fixture.whenStable();
    await waitForAnimationFrame();
    fixture.detectChanges();

    expect(chat.messages.at(-1)?.value).toBe('incoming');
    expect(scrollTopValue).toBe(520);
    expect(fixture.nativeElement.querySelector('.scroll-to-bottom-button')).toBeNull();
    requestAnimationFrameSpy.mockRestore();
  });

  it('renders a supporter message when it arrives after the chat is already open', async () => {
    const chat = await renderChat([new Message('existing')]);

    chat.supporter.sendMessage('incoming');
    await fixture.whenStable();
    await waitForAnimationFrame();
    fixture.detectChanges();

    const renderedMessages = Array.from(
      fixture.nativeElement.querySelectorAll('.message-markdown'),
    ) as HTMLElement[];

    expect(renderedMessages.map((element) => element.textContent?.trim())).toEqual([
      'existing',
      'incoming',
    ]);
  });

  it('shows a highlighted scroll-to-bottom button instead of auto-scrolling when the user is away from the bottom', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    let scrollHeightValue = 480;
    let scrollTopValue = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeightValue,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const chat = await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await updateBottomSentinelVisibility(true);
    await updateBottomSentinelVisibility(false);
    scrollTopValue = 40;

    scrollHeightValue = 520;
    chat.supporter.sendMessage('incoming');
    await Promise.resolve();
    await fixture.whenStable();
    await waitForAnimationFrame();
    fixture.detectChanges();

    expect(scrollTopValue).toBe(40);
    const button = fixture.nativeElement.querySelector(
      '.scroll-to-bottom-button',
    ) as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.classList.contains('scroll-to-bottom-button--highlight')).toBe(true);
    requestAnimationFrameSpy.mockRestore();
  });

  it('scrolls to the bottom when clicking the scroll-to-bottom button', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    let scrollHeightValue = 480;
    let scrollTopValue = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeightValue,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await updateBottomSentinelVisibility(true);
    await updateBottomSentinelVisibility(false);

    scrollHeightValue = 520;
    const button = fixture.nativeElement.querySelector(
      '.scroll-to-bottom-button',
    ) as HTMLButtonElement | null;
    button?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForAnimationFrame();

    expect(scrollTopValue).toBe(520);
    requestAnimationFrameSpy.mockRestore();
  });

  it('hides the scroll-to-bottom button and clears highlight when the sentinel becomes visible again', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();

    const chat = await renderChat([new Message('existing')]);
    await waitForAnimationFrame();
    await updateBottomSentinelVisibility(true);
    await updateBottomSentinelVisibility(false);

    chat.supporter.sendMessage('incoming');
    await Promise.resolve();
    await fixture.whenStable();
    await waitForAnimationFrame();
    fixture.detectChanges();

    expect(fixture.componentInstance.highlightScrollToBottomButton()).toBe(true);
    expect(fixture.nativeElement.querySelector('.scroll-to-bottom-button')).not.toBeNull();

    await updateBottomSentinelVisibility(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.highlightScrollToBottomButton()).toBe(false);
    expect(fixture.nativeElement.querySelector('.scroll-to-bottom-button')).toBeNull();
    requestAnimationFrameSpy.mockRestore();
  });

  it('cleans up old chat listeners when switching chats', async () => {
    const requestAnimationFrameSpy = mockAnimationFrameAsync();
    let scrollTopValue = 0;

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 520,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: (value: number) => {
        scrollTopValue = value;
      },
    });

    const firstChat = await renderChat([new Message('first chat message')]);
    await waitForAnimationFrame();

    const secondChat = new Chat(2, 'Second Chat', 'Online', 'SC', new Supporter());
    secondChat.supporter.setAgent(new Agent());
    secondChat.messages = [new Message('second chat message')];
    fixture.componentRef.setInput('chat', secondChat);
    fixture.detectChanges();
    await fixture.whenStable();
    await waitForAnimationFrame();

    scrollTopValue = 120;
    firstChat.supporter.sendMessage('stale incoming');
    await fixture.whenStable();
    await waitForAnimationFrame();
    fixture.detectChanges();

    const renderedMessages = Array.from(
      fixture.nativeElement.querySelectorAll('.message-markdown'),
    ) as HTMLElement[];

    expect(renderedMessages.map((element) => element.textContent?.trim())).toEqual([
      'second chat message',
    ]);
    expect(scrollTopValue).toBe(120);
    expect(fixture.componentInstance.highlightScrollToBottomButton()).toBe(false);
    requestAnimationFrameSpy.mockRestore();
  });
});
