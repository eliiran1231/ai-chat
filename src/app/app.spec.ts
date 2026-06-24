import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { REGISTERED_AGENTS } from '../services/agents.module';
import { CHAT_PROVIDER } from '../services/chat-providers.module';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: REGISTERED_AGENTS,
          useValue: {},
        },
        {
          provide: CHAT_PROVIDER,
          useValue: {
            getChats: () => [],
          },
          multi: true,
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('WhatsApp');
  });
});
