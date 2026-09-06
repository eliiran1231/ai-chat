import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { MessageCollection } from '../../classes/MessageCollection';
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

    const message = new Message('Selected message');
    component.chat().messages.set([message]);
    const selection = new MessageCollection(component.chat());
    selection.addMessage(message);
    fixture.componentRef.setInput('selectedMessages', selection);
    fixture.detectChanges();

    expect(component.searchMode()).toBe(false);
    expect(component.messageOptionsMode()).toBe(true);
  });

  it('shows the selection count and only enables deletion when every message allows it', () => {
    const first = new Message('First', { from: 'client' });
    const second = new Message('Second', { from: 'client', deletable: false });
    component.chat().messages.set([first, second]);
    const selection = new MessageCollection(component.chat());
    selection.addMessage(first);
    selection.addMessage(second);
    fixture.componentRef.setInput('selectedMessages', selection);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 selected');
    expect(fixture.nativeElement.querySelector('[aria-label="Edit message"]')).toBeNull();
    const deleteButton = fixture.nativeElement.querySelector('[aria-label="Delete selected messages"]') as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    second.deletable.set(true);
    fixture.detectChanges();
    expect(deleteButton.disabled).toBe(false);
    const deleted = vi.fn();
    component.deleteMessages.subscribe(deleted);
    deleteButton.click();
    expect(deleted).toHaveBeenCalledOnce();
  });
});
