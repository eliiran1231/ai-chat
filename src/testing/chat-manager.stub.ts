import { ChatManager } from '../classes/ChatManager';
import { ClientNegotiator } from '../classes/ClientNegotiator';
import { MessageStatus } from '../enums/MessagesStatus';

export function createChatManagerStub(): ChatManager {
  return Object.assign(Object.create(ChatManager.prototype) as ChatManager, {
    requestMessageSend: () => MessageStatus.Read,
    createClientNegotiator: () => new ClientNegotiator(
      { confirm: async () => true },
      { translate: (key: string) => key },
    ),
    requestMessageEdit: () => MessageStatus.Read,
    requestMessageDelete: () => MessageStatus.Read,
    requestDelete: () => true,
    requestPropChange: () => MessageStatus.Read,
    handleFile: () => '',
  });
}
