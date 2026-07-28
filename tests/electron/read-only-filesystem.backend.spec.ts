import { describe, expect, it } from 'vitest';
import { ReadOnlyFilesystemBackend } from '../../services/permissions/read-only-filesystem.backend.ts';

describe('ReadOnlyFilesystemBackend', () => {
  const backend = new ReadOnlyFilesystemBackend({ rootDir: process.cwd() });

  it('denies writes and edits at the backend boundary', async () => {
    await expect(backend.write('blocked.txt', 'content')).resolves.toEqual({
      error: 'File writes are disabled.',
    });
    await expect(backend.edit('blocked.txt', 'before', 'after')).resolves.toEqual({
      error: 'File edits are disabled.',
    });
  });
});
