import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
