import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderListComponent } from './provider-list-component';
import { CHAT_PROVIDER } from '../../services/chat-providers.module';
import { ChatService } from '../../services/chat.service';

describe('ProviderListComponent', () => {
  let component: ProviderListComponent;
  let fixture: ComponentFixture<ProviderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderListComponent],
      providers: [
        { provide: CHAT_PROVIDER, useValue: [] },
        {
          provide: ChatService,
          useValue: {
            loadProviderChats: vi.fn(),
            clearChats: vi.fn(),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
