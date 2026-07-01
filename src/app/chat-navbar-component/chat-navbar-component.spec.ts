import { Component, Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { DefaultManager } from '../../chat-managers/DefaultManager';
import { ChatProvider } from '../../interfaces/ChatProvider';
import { Uuid } from '../../interfaces/db/Uuid';

import { ChatNavbarComponent } from './chat-navbar-component';

@Component({ template: '' })
class TestAuthenticationComponent {}

const chatProviderStub: ChatProvider = {
  metadata: {
    id: 'test',
    displayName: 'Test',
    description: 'Test chat provider',
    authenticationComponent: TestAuthenticationComponent,
  },
  authentication: {
    loggedIn: true,
    register: async () => ({ id: 'test-user', email: 'test@example.com' }),
    login: async () => ({ id: 'test-user', email: 'test@example.com' }),
    logout: async () => {},
    getCurrentUser: async () => ({ id: 'test-user', email: 'test@example.com' }),
  },
  createChat: () => {
    throw new Error('Not implemented');
  },
  addMessage: () => {},
  deleteMessage: () => {},
  editMessage: () => {},
  getChats: () => [],
  deleteChat: () => {},
};

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
        'test-chat-id' as Uuid,
        'Test Chat',
        new Supporter('test-supporter-id' as Uuid),
        new DefaultManager(TestBed.inject(Injector), chatProviderStub),
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
