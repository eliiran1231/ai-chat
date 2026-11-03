export const FILE_CHANNELS = {
  save: 'files:save',
  list: 'files:list',
  read: 'files:read',
  delete: 'files:delete',
} as const;

export const MAX_CHAT_FILE_BYTES = 25 * 1024 * 1024;

export interface SavedChatFile {
  id: string;
  chatId: string;
  pathFile: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface SaveChatFileRequest {
  chatId: string;
  name: string;
  type: string;
  bytes: Uint8Array;
}

export interface ChatFileRequest {
  chatId: string;
  fileId: string;
}

export interface ReadChatFileResult {
  file: SavedChatFile;
  bytes: Uint8Array;
}

