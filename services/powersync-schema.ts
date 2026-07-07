import { column, Schema, Table } from '@powersync/node';

const chats = new Table(
  {
    // id column (text) is automatically included
    name: column.text,
    status: column.text,
    avatar: column.text,
    subtitle: column.text,
    time_label: column.text,
    unread_count: column.integer,
    highlight_time: column.integer,
    avatar_ring: column.integer,
    tip_label: column.text,
    owner_user_id: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: {} }
);

const messages = new Table(
  {
    // id column (text) is automatically included
    chat_id: column.text,
    sender: column.text,
    message_type: column.text,
    value: column.text,
    tag: column.text,
    time: column.text,
    edited_at: column.text,
    attachment: column.text,
    possible_answers: column.text,
    answer_selection_mode: column.text,
    validator_spec: column.text,
    validation_error_message: column.text,
    status: column.integer,
    editable: column.integer,
    deletable: column.integer
  },
  { indexes: { messages_chat: ['chat_id'] } }
);

const supporters = new Table(
  {
    // id column (text) is automatically included
    chat_id: column.text,
    agent_name: column.text,
    name: column.text,
    expects: column.text,
    context: column.text,
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: { supporters_chat: ['chat_id'] } }
);

export const AppSchema = new Schema({
  chats,
  messages,
  supporters
});

export type Database = (typeof AppSchema)['types'];
