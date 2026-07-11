import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type {
  PermissionOperation,
  PermissionPolicy,
  PermissionPolicyResult,
} from '../../shared/permissions/permission.js';

const READ_TOOLS = new Set(['read_file', 'ls', 'glob', 'grep']);

export class FilesystemReadPermissionPolicy implements PermissionPolicy {
  readonly kind = 'filesystem.read';
  private readonly roots: string[];

  constructor(roots: string[]) {
    if (!roots.length) throw new Error('At least one filesystem permission root is required.');
    this.roots = roots.map((root) => path.resolve(root));
  }

  async canonicalize(operation: PermissionOperation): Promise<PermissionPolicyResult> {
    if (!READ_TOOLS.has(operation.name)) throw new Error('UNSUPPORTED_PERMISSION_OPERATION');

    const pathKey = operation.name === 'read_file' ? 'file_path' : 'path';
    const supplied = operation.arguments[pathKey];
    if (typeof supplied !== 'string' || !supplied.trim() || supplied.includes('\0')) {
      throw new Error('INVALID_FILESYSTEM_PATH');
    }

    const resolved = path.resolve(supplied);
    const canonicalPath = await fs.realpath(resolved);
    const canonicalRoots = await Promise.all(
      this.roots.map(async (root) => {
        try {
          return await fs.realpath(root);
        } catch {
          return root;
        }
      }),
    );
    if (!canonicalRoots.some((root) => this.isWithin(root, canonicalPath))) {
      throw new Error('FILESYSTEM_PATH_OUTSIDE_ALLOWED_ROOTS');
    }

    const stat = await fs.stat(canonicalPath);
    if (operation.name === 'read_file' ? !stat.isFile() : !stat.isDirectory()) {
      throw new Error('FILESYSTEM_RESOURCE_TYPE_MISMATCH');
    }

    const canonicalOperation = {
      name: operation.name,
      arguments: { ...operation.arguments, [pathKey]: canonicalPath },
    };
    return {
      canonicalOperation,
      request: {
        id: crypto.randomUUID(),
        kind: this.kind,
        title: 'Allow file access?',
        description: this.description(operation.name),
        resource: canonicalPath,
        operation: canonicalOperation,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private isWithin(root: string, candidate: string): boolean {
    const normalizedRoot = this.normalizeForComparison(root);
    const normalizedCandidate = this.normalizeForComparison(candidate);
    const relative = path.relative(normalizedRoot, normalizedCandidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  private normalizeForComparison(value: string): string {
    const withoutExtendedPrefix = value.replace(/^\\\\\?\\/, '').replace(/^\\\\\.\\/, '');
    const normalized = path.normalize(withoutExtendedPrefix);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  }

  private description(tool: string): string {
    if (tool === 'read_file') return 'Deep Agent wants to read this file.';
    if (tool === 'ls') return 'Deep Agent wants to list this folder.';
    if (tool === 'glob') return 'Deep Agent wants to find files in this folder.';
    return 'Deep Agent wants to search file contents in this folder.';
  }
}
