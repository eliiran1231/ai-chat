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
    fixture.componentRef.setInput('message', new Message('hello', 'supporter'));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
