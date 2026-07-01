import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderListComponent } from './provider-list-component';
import { CHAT_PROVIDER } from '../../services/chat-providers.module';

describe('ProviderListComponent', () => {
  let component: ProviderListComponent;
  let fixture: ComponentFixture<ProviderListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderListComponent],
      providers: [{ provide: CHAT_PROVIDER, useValue: [] }],
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
