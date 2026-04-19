export interface CreateChatRecordInput {
  name: string;
  status: string;
  avatar: string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
}
