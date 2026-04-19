import { Inject, Injectable, Injector, Type } from '@angular/core';
import { Agent } from '../classes/Agent';
import { REGISTERED_AGENTS } from './agents.module';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
  entries: [string, Type<Agent>][];
  cache = new Map<string, string>();
  private agents: Record<string, Type<Agent>>;
  
  constructor(
    private injector: Injector,
    @Inject(REGISTERED_AGENTS) registeredAgents: Record<string, Type<Agent>>,
  ) {
    this.entries = Object.entries(registeredAgents);
    this.agents = registeredAgents;
  }

  getAgentByName(name: string): Agent {
    const AgentClass = this.agents[name];
    if (!AgentClass) {
      throw new Error(`Agent "${name}" is not registered.`);
    }
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
