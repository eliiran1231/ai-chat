import { Subject } from 'rxjs';
import { Message } from './Message';
import { Supporter } from './Supporter';
import { Client } from './Client';
import { Uuid } from '../interfaces/db/Uuid';
import { DBEntity, dbProperty } from './DBEntity';
import { ChatProvider } from '../interfaces/ChatProvider';

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

export class Chat extends DBEntity {
  id: Uuid;
  @dbProperty
  name: string;
  @dbProperty
  status: string;
  @dbProperty
  subtitle?: string;
  @dbProperty
  timeLabel?: string;
  @dbProperty
  unreadCount: number;
  @dbProperty
  highlightTime?: boolean;
  @dbProperty
  avatarRing?: boolean;
  @dbProperty
  tipLabel?: string;
  draftMessage: string;
  messages: Message[];
  supporter: Supporter;
  user: Client;
  active: boolean = false;
  private _avatar: Avatar;
  private provider: ChatProvider;
  public readonly onMessageEdited = new Subject<Message>();
  public readonly onMessageDeleted = new Subject<Message>();

  get avatar(): Readonly<Avatar> {
    return this._avatar;
  }

  get isRead(): boolean {
    return this.unreadCount === 0 && this.messages.every((message) => message.isRead);
  }

  set isRead(isRead: boolean) {
    if (!isRead) return;
    this.unreadCount = 0;
    this.messages.forEach((message) => (message.isRead = true));
  }

  constructor(
    id: Uuid,
    name: string,
    supporter: Supporter,
    provider: ChatProvider,
    options: ChatOptions = {},
  ) {
    super();
    this.provider = provider;
    this.id = id;
    this.name = name;
    this.status = options.status ?? '';
    this._avatar = options.avatar ?? { type: 'text', value: name.slice(0, 2).toUpperCase() };
    this.messages = []
    this.supporter = supporter;
    this.supporter.setChat(this);
    this.user = new Client(this);
    this.draftMessage = '';
    this.subtitle = options.subtitle ?? 'Tap to start chatting';
    this.timeLabel = options.timeLabel ?? 'now';
    this.unreadCount = options.unreadCount ?? 0;
    this.highlightTime = options.highlightTime;
    this.avatarRing = options.avatarRing;
    this.tipLabel = options.tipLabel;
    this.enableDbChanges();
  }
  
  private _processFileUrlDriver(file: File): string | Promise<string> {
    return URL.createObjectURL(file);
  }

  processFileUrl(file: File): string | Promise<string> {
    return this._processFileUrlDriver(file);
  }

  async updateAvatar(avatar: Avatar) {
    this._avatar = avatar;
    await this.saveChanges();
  }

  setFileUrlProcessor(processor: typeof this._processFileUrlDriver) {
    this._processFileUrlDriver = processor;
  }

  delete(){
    return this.provider.deleteChat(this.id);
  }
}
