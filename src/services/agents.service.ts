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
  entries: [string, Type<Agent>][];
  cache = new Map<string, string>();

  constructor(private injector: Injector) {
    this.entries = Object.entries(this.agents);
  }

  getAgentByName(name: string): Agent {
    const AgentClass = this.agents[name];
    return new AgentClass(this.injector);
  }

  getAgentName(agent: Agent): string {
    const agentMinifiedName = agent.constructor.name; 
    if (this.cache.has(agentMinifiedName)) {
      return this.cache.get(agentMinifiedName)!;
    }
    const entry = this.entries.find(([, AgentClass]) => agent instanceof AgentClass);
    if (!entry?.[0]) throw new Error(`Agent is not registered in AgentsService`);
    this.cache.set(agentMinifiedName, entry[0]);
    return entry[0];
  }

  getRegisteredAgents(): Record<string, Type<Agent>> {
    return { ...this.agents };
  }
}
