import { Injectable, Injector, Type } from '@angular/core';
import { Agent } from '../classes/Agent';
import { AiAgent } from '../agents/AiAgent';
import { FlowAgent } from '../agents/FlowAgent';
import { MockAgent } from '../agents/MockAgent';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
  private agents: Record<string, Type<Agent>> = {
    AiAgent,
    FlowAgent,
    MockAgent
  };

  constructor(private injector: Injector) {}

  getAgentByName(name: string): Agent {
    const AgentClass = this.agents[name];
    return new AgentClass(this.injector);
  }

  getAgentName(agent: Agent): string {
    const entry = Object.entries(this.agents).find(([, AgentClass]) => agent instanceof AgentClass);
    return entry?.[0] ?? agent.constructor.name;
  }

  getRegisteredAgents(): Record<string, Type<Agent>> {
    return { ...this.agents };
  }
}
