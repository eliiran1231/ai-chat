import type { PowerSyncSQLiteDatabase } from '@powersync/drizzle-driver';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// PowerSync schemas carry column types and indexes, but not NOT NULL constraints.
// These markers document invariants enforced by our service/backend write paths;
// they do not migrate or reject older rows already stored by PowerSync.
export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  avatar: text('avatar').notNull(),
  subtitle: text('subtitle'),
  timeLabel: text('time_label'),
  unreadCount: integer('unread_count'),
  highlightTime: integer('highlight_time').notNull(),
  avatarRing: integer('avatar_ring').notNull(),
  tipLabel: text('tip_label'),
  ownerUserId: text('owner_user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id').notNull(),
    sender: text('sender').notNull(),
    messageType: text('message_type'),
    value: text('value').notNull(),
    tag: text('tag'),
    time: text('time').notNull(),
    editedAt: text('edited_at'),
    attachment: text('attachment'),
    possibleAnswers: text('possible_answers'),
    answerSelectionMode: text('answer_selection_mode'),
    validatorSpec: text('validator_spec'),
    validationErrorMessage: text('validation_error_message'),
    status: integer('status').notNull(),
    editable: integer('editable').notNull(),
    deletable: integer('deletable').notNull(),
  },
  (table) => [index('messages_chat').on(table.chatId)],
);

export const supporters = sqliteTable(
  'supporters',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id').notNull(),
    agentName: text('agent_name').notNull(),
    name: text('name').notNull(),
    expects: text('expects'),
    context: text('context'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('supporters_chat').on(table.chatId)],
);

export const drizzleSchema = { chats, messages, supporters };

export type AppDrizzleDatabase = PowerSyncSQLiteDatabase<typeof drizzleSchema>;
export type ChatRow = typeof chats.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type SupporterRow = typeof supporters.$inferSelect;
