import { Avatar } from '../../classes/Chat';

export interface CreateChatRecordInput {
  name: string;
  status: string;
  avatar: Avatar;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
}
