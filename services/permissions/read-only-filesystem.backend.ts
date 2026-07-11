import {
  FilesystemBackend,
  type EditResult,
  type WriteResult,
} from 'deepagents';

export class ReadOnlyFilesystemBackend extends FilesystemBackend {
  override async write(_filePath: string, _content: string): Promise<WriteResult> {
    return { error: 'File writes are disabled.' };
  }

  override async edit(
    _filePath: string,
    _oldString: string,
    _newString: string,
    _replaceAll?: boolean,
  ): Promise<EditResult> {
    return { error: 'File edits are disabled.' };
  }
}

