import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilesystemReadPermissionPolicy } from '../../services/permissions/filesystem-read-permission.policy.ts';
import { PermissionService } from '../../services/permissions/permission.service.ts';

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((entry) => fs.rm(entry, { recursive: true, force: true })));
});

describe('permission services', () => {
  it('canonicalizes a readable path before presenting it', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-chat-permission-'));
    cleanup.push(root);
    const nested = path.join(root, 'nested');
    await fs.mkdir(nested);
    const file = path.join(root, 'note.txt');
    await fs.writeFile(file, 'safe');
    const presenter = { present: vi.fn(async () => 'approve' as const), dismiss: vi.fn() };
    const service = new PermissionService(presenter);

    const result = await service.request(new FilesystemReadPermissionPolicy([root]), {
      name: 'read_file',
      arguments: { file_path: path.join(nested, '..', 'note.txt') },
    });

    const canonical = await fs.realpath(file);
    expect(result?.canonicalOperation.arguments['file_path']).toBe(canonical);
    expect(presenter.present).toHaveBeenCalledWith(
      expect.objectContaining({ resource: canonical, kind: 'filesystem.read' }),
    );
  });

  it('rejects canonical paths outside the configured scope before presenting', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-chat-permission-root-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-chat-permission-outside-'));
    cleanup.push(root, outside);
    const file = path.join(outside, 'secret.txt');
    await fs.writeFile(file, 'secret');
    const presenter = { present: vi.fn(async () => 'approve' as const), dismiss: vi.fn() };

    await expect(
      new PermissionService(presenter).request(new FilesystemReadPermissionPolicy([root]), {
        name: 'read_file',
        arguments: { file_path: file },
      }),
    ).rejects.toThrow('FILESYSTEM_PATH_OUTSIDE_ALLOWED_ROOTS');
    expect(presenter.present).not.toHaveBeenCalled();
  });
});
