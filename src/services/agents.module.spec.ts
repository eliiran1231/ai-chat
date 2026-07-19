import { TestBed } from '@angular/core/testing';
import { AppAgentsModule } from '../app/app-agents.module';
import { DeepAgent } from '../agents/DeepAgent/DeepAgent';
import { provideAgents, REGISTERED_AGENTS } from './agents.module';

describe('AppAgentsModule', () => {
  it('registers DeepAgent as the AI conversation engine', () => {
    TestBed.configureTestingModule({ providers: [provideAgents(AppAgentsModule)] });

    const agents = TestBed.inject(REGISTERED_AGENTS) as unknown as Record<string, unknown>;

    expect(agents['DeepAgent']).toBe(DeepAgent);
    expect(agents['AiAgent']).toBeUndefined();
  });
});
