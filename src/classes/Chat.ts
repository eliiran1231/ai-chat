import { Subject } from 'rxjs';
import { Message } from './Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { Supporter } from './Supporter';
import { Client } from './Client';
import { Uuid } from '../interfaces/db/Uuid';
import { SyncedEntity } from './SyncedEntity';
import { ChatManager } from './ChatManager';
import { syncedSignal, SyncedSignal } from '../signals/syncedSignal';
import { computed, signal, Signal, WritableSignal } from '@angular/core';

export type Avatar = {
  type: 'image' | 'text';
  value: string;
};

export type ChatOptions = {
  status?: string,
  avatar?: Avatar,
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
}

export class Chat extends SyncedEntity {
  readonly id: Signal<Uuid>;
  readonly name: SyncedSignal<string>;
  readonly status: SyncedSignal<string>;
  readonly subtitle: SyncedSignal<string>;
  readonly timeLabel: SyncedSignal<string>;
  readonly unreadCount: SyncedSignal<number>;
  readonly highlightTime: SyncedSignal<boolean>;
  readonly avatarRing: SyncedSignal<boolean>;
  readonly tipLabel: SyncedSignal<string>;
  readonly draftMessage: WritableSignal<string>;
  readonly messages: WritableSignal<Message[]>;
  readonly avatar: SyncedSignal<Avatar>;
  readonly isRead = computed(() => this.unreadCount() === 0 && this.messages().every((message) => message.status() === MessageStatus.Read));
  readonly supporter: Supporter;
  readonly active: WritableSignal<boolean> = signal(false);
  readonly user: Client;
  private manager: ChatManager;
  public readonly onMessageEdited = new Subject<Message>();
  public readonly onMessageDeleted = new Subject<Message>();

  markAsRead() {
    this.unreadCount.set(0);
    for (let message of this.messages()) {
      if(message.from() == "supporter") message.status.set(MessageStatus.Read);
    }
  }

  constructor(
    id: Uuid,
    name: string,
    supporter: Supporter,
    manager: ChatManager,
    options: ChatOptions = {},
  ) {
    super();
    this.id = signal(id);
    this.name = syncedSignal(name);
    this.status = syncedSignal(options.status ?? '');
    this.avatar = syncedSignal(options.avatar ?? { type: 'text', value: name.slice(0, 2).toUpperCase() });
    this.messages = signal([]);
    this.supporter = supporter;
    this.supporter.setChat(this);
    this.manager = manager;
    this.manager.init(this);
    this.user = new Client(this);
    this.draftMessage = signal('');
    this.subtitle = syncedSignal(options.subtitle ?? 'Tap to start chatting');
    this.timeLabel = syncedSignal(options.timeLabel ?? 'now');
    this.unreadCount = syncedSignal(options.unreadCount ?? 0);
    this.highlightTime = syncedSignal(options.highlightTime ?? false);
    this.avatarRing = syncedSignal(options.avatarRing ?? false);
    this.tipLabel = syncedSignal(options.tipLabel ?? '');
    this.initSync()
  }

  processFileUrl(file: File): string | Promise<string> {
    return this.manager.handleFile(file);
  }

  delete(){
    return this.manager.requestChatDelete();
  }
}
