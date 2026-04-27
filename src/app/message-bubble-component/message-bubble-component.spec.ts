import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { Message } from '../../classes/Message';

import { MessageBubbleComponent } from './message-bubble-component';

describe('MessageBubbleComponent', () => {
  let component: MessageBubbleComponent;
  let fixture: ComponentFixture<MessageBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageBubbleComponent],
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
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageBubbleComponent);
    component = fixture.componentInstance;
    const message = new Message('hello');
    message.from = 'supporter';
    fixture.componentRef.setInput('message', message);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('highlights the search term in the message body', async () => {
    const message = new Message('hello world');
    message.from = 'supporter';

    fixture.componentRef.setInput('message', message);
    fixture.componentRef.setInput('searchTerm', 'world');
    fixture.detectChanges();
    await fixture.whenStable();

    const highlightedText = fixture.nativeElement.querySelector('.message-markdown mark') as HTMLElement | null;

    expect(highlightedText?.textContent).toBe('world');
  });
});
