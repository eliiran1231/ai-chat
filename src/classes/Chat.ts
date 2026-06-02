import { Subject } from 'rxjs';
import { Message } from './Message';
import { Supporter } from './Supporter';
import { Client } from './Client';
import { Uuid } from '../interfaces/db/Uuid';
import { DBEntity } from './DBEntity';

export type Avatar = {
  type: 'image' | 'text';
  value: string;
};

export class Chat extends DBEntity {
  id: Uuid;
  name: string;
  status: string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
  draftMessage: string;
  messages: Message[];
  supporter: Supporter;
  user: Client;
  active: boolean = false;
  private _avatar: Avatar;
  public readonly onMessageEdited = new Subject<Message>();
  public readonly onMessageDeleted = new Subject<Message>();

  get avatar(): Readonly<Avatar> {
    return this._avatar;
  }

  constructor(
    id: Uuid,
    name: string,
    status: string,
    avatar: Avatar,
    supporter: Supporter,
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
  updateAvatar(avatar: Avatar) {
    this._avatar = avatar;
    this.saveChanges();
  }
  setFileUrlProcessor(processor: typeof this._processFileUrlDriver) {
    this._processFileUrlDriver = processor;
  }
}
