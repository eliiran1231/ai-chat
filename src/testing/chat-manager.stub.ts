import type { ChatManager } from '../classes/ChatManager';
import { MessageStatus } from '../enums/MessagesStatus';

export function createChatManagerStub(): ChatManager {
  return {
    init: () => undefined,
    requestMessageSend: () => MessageStatus.Read,
    requestMessageEdit: () => MessageStatus.Read,
    requestMessageDelete: () => MessageStatus.Read,
    requestDelete: () => true,
    requestPropChange: () => MessageStatus.Read,
    handleFile: () => '',
  } as unknown as ChatManager;
}
