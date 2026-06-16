import { inject, Inject, Injectable, Injector, Type } from '@angular/core';
import { ChatManager } from '../classes/ChatManager';
import { REGISTERED_CHAT_MANAGERS } from './chat-managers.module';

@Injectable({
  providedIn: 'root',
})
export class ChatManagersService {
  private entries: [string, Type<ChatManager>][];
  private cache = new Map<string, string>();
  private managers: Record<string, Type<ChatManager>>;

  constructor(
    private injector: Injector,
    @Inject(REGISTERED_CHAT_MANAGERS) registeredManagers: Record<string, Type<ChatManager>>,
  ) {
    this.entries = Object.entries(registeredManagers);
    this.managers = registeredManagers;
  }

  getManagerByName(name: string): ChatManager {
    const ManagerClass = this.managers[name];
    if (!ManagerClass) {
      throw new Error(`ChatManager "${name}" is not registered.`);
    }
    this.cache.set(ManagerClass.name, name);
    return this.injector.get(ManagerClass);
  }

  getManagerName(manager: ChatManager): string {
    const managerMinifiedName = manager.constructor.name;
    if (this.cache.has(managerMinifiedName)) {
      return this.cache.get(managerMinifiedName)!;
    }
    const entry = this.entries.find(([, ManagerClass]) => manager instanceof ManagerClass);
    if (!entry?.[0]) throw new Error(`ChatManager is not registered in ChatManagersService`);
    this.cache.set(managerMinifiedName, entry[0]);
    return entry[0];
  }

  getRegisteredManagers(): Record<string, Type<ChatManager>> {
    return { ...this.managers };
  }
}