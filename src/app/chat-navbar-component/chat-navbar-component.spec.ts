import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';

import { ChatNavbarComponent } from './chat-navbar-component';

describe('ChatNavbarComponent', () => {
  let component: ChatNavbarComponent;
  let fixture: ComponentFixture<ChatNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatNavbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'chat',
      new Chat(
        'test-chat-id',
        'Test Chat',
        'Online',
        { type: 'text', value: 'TC' },
        new Supporter(),
      ),
    );
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
