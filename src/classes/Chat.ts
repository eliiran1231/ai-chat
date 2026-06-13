import { Subject } from 'rxjs';
import { Message } from './Message';
import { Supporter } from './Supporter';
import { Client } from './Client';
import { Uuid } from '../interfaces/db/Uuid';
import { DBEntity, dbProperty } from './DBEntity';
import { ChatManager } from './ChatManager';

export type Avatar = {
  type: 'image' | 'text';
  value: string;
};

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
  chatManager: ChatManager;
  user: Client;
  active: boolean = false;
  private _avatar: Avatar;
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
    status: string,
    avatar: Avatar,
    supporter: Supporter,
    chatManager: ChatManager,
    options: {
      subtitle?: string;
      timeLabel?: string;
      unreadCount?: number;
      highlightTime?: boolean;
      avatarRing?: boolean;
      tipLabel?: string;
    } = {},
  ) {
    super();
    this.id = id;
    this.name = name;
    this.status = status;
    this._avatar = avatar;
    this.messages = []
    this.supporter = supporter;
    this.chatManager = chatManager;
    this.chatManager.init(this);
    this.supporter.setChat(this);
    this.user = new Client(this);
    this.draftMessage = '';
    this.subtitle = options.subtitle;
    this.timeLabel = options.timeLabel;
    this.unreadCount = options.unreadCount || 0;
    this.highlightTime = options.highlightTime;
    this.avatarRing = options.avatarRing;
    this.tipLabel = options.tipLabel;
    this.enableDbChanges();
  }
  private _processFileUrlDriver(file: File) : string | Promise<string>{
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
}
