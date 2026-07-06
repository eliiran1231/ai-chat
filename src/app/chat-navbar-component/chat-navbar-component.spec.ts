import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { Uuid } from '../../interfaces/db/Uuid';
import { createChatManagerStub } from '../../testing/chat-manager.stub';

import { ChatNavbarComponent } from './chat-navbar-component';

describe('ChatNavbarComponent', () => {
  let component: ChatNavbarComponent;
  let fixture: ComponentFixture<ChatNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatNavbarComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatNavbarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput(
      'chat',
      new Chat(
        'test-chat-id' as Uuid,
        'Test Chat',
        new Supporter('test-supporter-id' as Uuid),
        createChatManagerStub(),
        { status: 'Online', avatar: { type: 'text', value: 'TC' } },
      ),
    );
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close search mode when a message is selected', () => {
    component.searchMode.set(true);

    fixture.componentRef.setInput('selectedMessage', new Message('Selected message'));
    fixture.detectChanges();

    expect(component.searchMode()).toBe(false);
    expect(component.messageOptionsMode()).toBe(true);
  });
});
