import { ChatManager } from '../classes/ChatManager';
import { MessageStatus } from '../enums/MessagesStatus';

export function createChatManagerStub(): ChatManager {
  return Object.assign(Object.create(ChatManager.prototype) as ChatManager, {
    requestMessageSend: () => MessageStatus.Read,
    requestMessageEdit: () => MessageStatus.Read,
    requestMessageDelete: () => MessageStatus.Read,
    requestDelete: () => true,
    requestPropChange: () => MessageStatus.Read,
    handleFile: () => '',
  });
}
