import { Avatar } from '../../classes/Chat';

export interface ChatRecord {
  id: number;
  name: string;
  status: string;
  avatar: Avatar | string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
  createdAt: string;
  updatedAt: string;
}
