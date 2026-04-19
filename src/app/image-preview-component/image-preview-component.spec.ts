import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Supporter } from '../../classes/Supporter';

import { ImagePreviewComponent } from './image-preview-component';

describe('ImagePreviewComponent', () => {
  let component: ImagePreviewComponent;
  let fixture: ComponentFixture<ImagePreviewComponent>;
  let chat: Chat;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePreviewComponent],
    }).compileComponents();

    const supporter = new Supporter();
    chat = new Chat(1, 'Test Chat', 'Online', 'TC', supporter);
    supporter.setAgent(new Agent(TestBed.inject(Injector)));

    fixture = TestBed.createComponent(ImagePreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chat', chat);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('submits a trimmed caption and syncs the chat draft', () => {
    const submitted: string[] = [];
    component.caption = '  Fresh slice  ';
    component.submitted.subscribe((message) => submitted.push(message));

    component.submitCaption();

    expect(submitted).toEqual(['Fresh slice']);
    expect(chat.draftMessage).toBe('Fresh slice');
    expect(component.caption).toBe('');
  });
});
