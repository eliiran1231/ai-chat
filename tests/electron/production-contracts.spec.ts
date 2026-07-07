import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PowerSync production contracts', () => {
  it('scopes chats and related rows to the authenticated user', () => {
    const config = readFileSync('powersync/sync-config.yaml', 'utf8');

    expect(config).toContain('owner_user_id = auth.user_id()');
    expect(config).toContain('INNER JOIN chats ON chats.id = messages.chat_id');
    expect(config).toContain('INNER JOIN chats ON chats.id = supporters.chat_id');
    expect(config).not.toMatch(/- SELECT \* FROM (messages|supporters)$/m);
  });

  it('documents atomic, idempotent, authorized backend uploads and cascade integrity', () => {
    const contract = readFileSync('docs/powersync-backend-contract.md', 'utf8').toLocaleLowerCase();

    for (const requirement of [
      'one database transaction',
      'idempotent',
      'owner_user_id',
      'on delete cascade',
      'cross-user',
      'cascaded child deletion',
    ]) {
      expect(contract).toContain(requirement);
    }
  });
});
