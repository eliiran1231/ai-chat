import { Inject, Injectable, Injector, Type } from '@angular/core';
import { Agent } from '../classes/Agent';
import { REGISTERED_AGENTS } from './agents.module';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
  private entries: [string, Type<Agent>][];
  private cache = new Map<Type<Agent>, string>();
  private agents: Record<string, Type<Agent>>;
  
  constructor(
    private injector: Injector,
    @Inject(REGISTERED_AGENTS) registeredAgents: Record<string, Type<Agent>>,
  ) {
    this.entries = Object.entries(registeredAgents);
    this.agents = registeredAgents;
  }

  getAgentByName(name: string): Agent {
    const AgentClass = this.getAgentClassByName(name);
    return new AgentClass(this.injector);
  }

  getAgentClassByName(name: string): Type<Agent> {
    const AgentClass = this.agents[name];
    if (!AgentClass) throw new Error(`Agent "${name}" is not registered.`);
    this.cache.set(AgentClass, name);
    return AgentClass;
  }

  getAgentName(agent: Agent): string {
    return this.getAgentClassName(agent.constructor as Type<Agent>);
  }

  getAgentClassName(agentClass: Type<Agent>): string {
    const cached = this.cache.get(agentClass);
    if (cached) return cached;
    const entry = this.entries.find(([, registeredClass]) => registeredClass === agentClass);
    if (!entry) throw new Error('Agent is not registered in AgentsService');
    this.cache.set(agentClass, entry[0]);
    return entry[0];
  }

  getRegisteredAgents(): Record<string, Type<Agent>> {
    return { ...this.agents };
  }
}
