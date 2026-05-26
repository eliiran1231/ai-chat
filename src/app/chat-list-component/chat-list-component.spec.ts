import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';

import { ChatListComponent } from './chat-list-component';

describe('ChatListComponent', () => {
  let component: ChatListComponent;
  let fixture: ComponentFixture<ChatListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a draft preview before the last message', () => {
    const supporter = new Supporter();
    const chat = new Chat('test-chat-id', 'Test Chat', 'Online', 'TC', supporter);
    supporter.setAgent(new Agent(TestBed.inject(Injector)));
    chat.draftMessage = 'answer in progress';

    fixture.componentRef.setInput('chats', [chat]);
    fixture.detectChanges();

    const draftLabel = fixture.nativeElement.querySelector(
      '.chat-list-item__draft-label',
    ) as HTMLElement | null;
    const preview = fixture.nativeElement.querySelector('.chat-list-item__bottom p') as HTMLElement;

    expect(draftLabel?.textContent).toBe('Draft:');
    expect(getComputedStyle(draftLabel as Element).color).toBe('rgb(33, 177, 93)');
    expect(preview.textContent?.trim()).toContain('Draft: answer in progress');
  });
});
