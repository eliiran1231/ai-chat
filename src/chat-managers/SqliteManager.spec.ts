import { Injector } from '@angular/core';
import { Answer } from '../classes/Answer';
import { Chat } from '../classes/Chat';
import { Attachment, Message } from '../classes/Message';
import { Supporter } from '../classes/Supporter';
import { SqliteProvider } from '../chat-providers/SqliteProvider';
import { MessageStatus } from '../enums/MessagesStatus';
import { AlertService } from '../services/alert.service';
import { ChatService } from '../services/chat.service';
import { DbService } from '../services/db.service';
import { ElectronService } from '../services/electron.service';
import { FileExplorerService } from '../services/fileExplorer.service';
import { LanguageService } from '../services/language.service';
import { SqliteManager } from './SqliteManager';

describe('SqliteManager attachment lifecycle', () => {
  let nextId = 0;
  beforeEach(() => {
    nextId = 0;
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => `blob:preview-${++nextId}`), revokeObjectURL: vi.fn() });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  function setup() {
    const files = {
      saveFile: vi.fn(async () => ({ id: `saved-${++nextId}` })),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      addMessage: vi.fn().mockResolvedValue(undefined),
      editBatch: vi.fn(async (messages: Message[]) => messages.map(message => message.id())),
      deleteBatch: vi.fn(async (ids: string[]) => ids),
    };
    const alerts = { confirm: vi.fn().mockResolvedValue(true), toast: vi.fn() };
    const injector = Injector.create({ providers: [
      { provide: FileExplorerService, useValue: files }, { provide: DbService, useValue: {} },
      { provide: ChatService, useValue: {} }, { provide: AlertService, useValue: alerts },
      { provide: LanguageService, useValue: { translate: (key: string) => key } },
    ] });
    const manager = new SqliteManager(injector, provider as unknown as SqliteProvider);
    const chat = new Chat('chat-a', 'Test', new Supporter('supporter'), manager);
    const respond = vi.spyOn(chat.supporter, 'respond').mockResolvedValue(undefined);
    return { files, provider, alerts, manager, chat, respond };
  }

  async function preview(manager: SqliteManager): Promise<Attachment> {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    return { name: 'hello', extension: 'txt', size: file.size, type: file.type, url: await manager.handleFile(file) };
  }

  function existing(chat: Chat, id: string): Message {
    const message = new Message('caption', { id, from: { type: 'client' }, status: MessageStatus.Sent,
      attachment: { fileId: id + '-file', name: 'old', extension: 'txt', type: 'text/plain', size: 3, url: 'blob:' + id } });
    message.setChat(chat);
    chat.messages.update(messages => [...messages, message]);
    return message;
  }

  it('only previews before Send; a failed file write blocks the DB/agent and can be retried', async () => {
    const { manager, files, provider, chat, respond } = setup();
    const attachment = await preview(manager);
    expect(files.saveFile).not.toHaveBeenCalled();
    files.saveFile.mockRejectedValueOnce(new Error('disk full'));
    const message = new Answer('caption', { attachment });
    expect(await chat.user.answer(message)).toBe(false);
    expect(message.status()).toBe(MessageStatus.Failed);
    expect(provider.addMessage).not.toHaveBeenCalled();
    expect(respond).not.toHaveBeenCalled();
    chat.user.createMessageCollection().addMessage(message); // Selecting Retry in the UI must keep the send callback.
    expect(await message.retry()).toBe(true);
    expect(files.saveFile).toHaveBeenCalledWith('chat-a', expect.any(File));
    expect(message.attachment()?.fileId).toBeTruthy();
    expect(chat.messages()).toEqual([message]);
    expect(respond).toHaveBeenCalledTimes(1);
  });

  it('reuses the saved file when only the message insert failed', async () => {
    const { manager, files, provider, chat } = setup();
    provider.addMessage.mockRejectedValueOnce(new Error('DB unavailable'));
    const message = new Answer('caption', { attachment: await preview(manager) });
    expect(await chat.user.answer(message)).toBe(false);
    expect(await message.retry()).toBe(true);
    expect(files.saveFile).toHaveBeenCalledTimes(1);
  });

  it('preserves the attachment through a failed text edit and its retry', async () => {
    const { files, provider, chat } = setup();
    const message = existing(chat, 'message-a');
    const old = message.attachment();
    provider.editBatch.mockRejectedValueOnce(new Error('DB rejected edit'));
    expect(await message.edit('new caption')).toBe(false);
    expect(message.attachment()).toBe(old);
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(await message.retry()).toBe(MessageStatus.Sent);
    expect(message.value()).toBe('new caption');
    expect(message.attachment()).toBe(old);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('preserves attachments when editing text individually and in a collection', async () => {
    const { files, chat } = setup();
    const first = existing(chat, 'first');
    const second = existing(chat, 'second');
    const firstAttachment = first.attachment();
    const secondAttachment = second.attachment();
    expect(await first.edit('new text')).toBe(true);
    expect(first.attachment()).toBe(firstAttachment);
    const collection = chat.user.createMessageCollection();
    collection.addMessage(first); collection.addMessage(second);
    expect(await collection.edit((_message, index) => `caption ${index}`)).toBe(MessageStatus.Sent);
    expect(first.value()).toBe('caption 0');
    expect(second.value()).toBe('caption 1');
    expect(first.attachment()).toBe(firstAttachment);
    expect(second.attachment()).toBe(secondAttachment);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('deletes by the persisted fileId, and removes only successful items in a partial batch', async () => {
    const { files, provider, chat } = setup();
    const single = existing(chat, 'single');
    expect(await single.delete()).toBe(true);
    expect(files.deleteFile).toHaveBeenCalledWith('chat-a', 'single-file');
    const first = existing(chat, 'first');
    const protectedMessage = existing(chat, 'protected');
    provider.deleteBatch.mockResolvedValueOnce(['first']);
    const collection = chat.user.createMessageCollection();
    collection.addMessage(first); collection.addMessage(protectedMessage);
    expect(await collection.delete()).toBe(MessageStatus.Failed);
    expect(chat.messages()).toEqual([protectedMessage]);
    expect(collection.messages()).toEqual(new Set([protectedMessage]));
    expect(files.deleteFile).not.toHaveBeenCalledWith('chat-a', 'protected-file');
  });

  it('preserves files when negotiation or the database rejects deletion', async () => {
    const { files, provider, alerts, chat } = setup();
    const message = existing(chat, 'single');
    alerts.confirm.mockResolvedValueOnce(false);
    expect(await message.delete()).toBe(false);
    expect(provider.deleteBatch).not.toHaveBeenCalled();
    provider.deleteBatch.mockRejectedValueOnce(new Error('DB failed'));
    expect(await message.delete()).toBe(false);
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(chat.messages()).toEqual([message]);
  });

  it('keeps a preview URL that another message still displays', async () => {
    const { chat } = setup();
    const first = existing(chat, 'first');
    const second = existing(chat, 'second');
    second.attachment.set(first.attachment(), true);
    await first.delete();
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(second.attachment()?.url);
  });

  it('reports disk cleanup failure without restoring an already deleted DB message', async () => {
    const { files, alerts, chat } = setup();
    const message = existing(chat, 'single');
    files.deleteFile.mockRejectedValueOnce(new Error('file locked'));
    expect(await message.delete()).toBe(true);
    expect(chat.messages()).toEqual([]);
    expect(alerts.toast).toHaveBeenCalledWith('file.cleanupFailed');
  });

  it('allows deleting a failed send that has no database row', async () => {
    const { manager, files, provider, chat } = setup();
    files.saveFile.mockRejectedValueOnce(new Error('disk full'));
    const message = new Answer('caption', { attachment: await preview(manager) });
    await chat.user.answer(message);
    provider.deleteBatch.mockResolvedValueOnce([]);
    expect(await message.delete()).toBe(true);
    expect(chat.messages()).toEqual([]);
  });
});

describe('FileExplorerService failed cleanup', () => {
  it('retries deletion before listing and blocks listing while deletion still fails', async () => {
    const invoke = vi.fn().mockRejectedValueOnce(new Error('locked')).mockRejectedValueOnce(new Error('still locked'));
    const injector = Injector.create({ providers: [FileExplorerService, { provide: ElectronService, useValue: { invoke } }] });
    const files = injector.get(FileExplorerService);
    await expect(files.deleteFile('chat-a', 'file-a')).rejects.toThrow('locked');
    await expect(files.listFiles('chat-a')).rejects.toThrow('still locked');
    expect(invoke).not.toHaveBeenCalledWith('files:list', expect.anything());
    invoke.mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);
    expect(await files.listFiles('chat-a')).toEqual([]);
    expect(invoke.mock.calls.slice(-2)).toEqual([
      ['files:delete', { chatId: 'chat-a', fileId: 'file-a' }], ['files:list', { chatId: 'chat-a' }],
    ]);
  });
});
