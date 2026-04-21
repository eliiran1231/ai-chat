import { InjectionToken, Provider, Type } from '@angular/core';
import { Agent } from '../classes/Agent';

export interface AgentsModuleMetadata {
  agents: Record<string, Type<Agent>>;
}

const AGENTS_MODULE_METADATA = Symbol('AGENTS_MODULE_METADATA');

export const REGISTERED_AGENTS = new InjectionToken<Type<Agent>[]>(
  'REGISTERED_AGENTS',
);

export function AgentsModule(metadata: AgentsModuleMetadata): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, AGENTS_MODULE_METADATA, {
      value: metadata,
      writable: false,
    });
  };
}

export function provideAgents(moduleType: Type<unknown>): Provider {
  const metadata = (moduleType as { [AGENTS_MODULE_METADATA]?: AgentsModuleMetadata })[
    AGENTS_MODULE_METADATA
  ];

  if (!metadata) {
    throw new Error(`${moduleType.name} is missing @AgentsModule metadata.`);
  }

  return {
    provide: REGISTERED_AGENTS,
    useValue: metadata.agents,
  };
}
