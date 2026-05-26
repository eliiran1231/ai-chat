import type { Uuid } from './Uuid';

export interface ChatRecord {
  id: Uuid;
  name: string;
  status: string;
  avatar: string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
  createdAt: string;
  updatedAt: string;
}
