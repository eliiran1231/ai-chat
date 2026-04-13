import { Message } from './Message';
import { Supporter } from './Supporter';
import { Client } from './Client';

export class Chat {
  id: number;
  name: string;
  status: string;
  avatar: string;
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

  constructor(
    id: number,
    name: string,
    status: string,
    avatar: string,
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
    this.id = id;
    this.name = name;
    this.status = status;
    this.avatar = avatar;
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
  }
}
