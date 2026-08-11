import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { deepAgentService, type DeepAgentService } from '../services/deep-agent.service.js';
import {
  DEEP_AGENT_CHANNELS,
  type CancelDeepAgentRunRequest,
  type DeleteDeepAgentThreadRequest,
  type StartDeepAgentRunRequest,
} from '../shared/ipc/deep-agent-channels.js';

export function registerDeepAgentHandlers(service: DeepAgentService = deepAgentService): void {
  const trackedSenders = new Set<number>();
  ipcMain.handle(
    DEEP_AGENT_CHANNELS.start,
    (event: IpcMainInvokeEvent, request: StartDeepAgentRunRequest) => {
      const senderId = event.sender.id;
      if (!trackedSenders.has(senderId)) {
        trackedSenders.add(senderId);
        event.sender.once('destroyed', () => {
          trackedSenders.delete(senderId);
          service.cancelSenderRuns(senderId);
        });
      }
      return service.start(request, senderId, (runEvent) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(DEEP_AGENT_CHANNELS.event, runEvent);
        }
      });
    },
  );

  ipcMain.handle(
    DEEP_AGENT_CHANNELS.cancel,
    (event: IpcMainInvokeEvent, request: CancelDeepAgentRunRequest) =>
      service.cancel(request.runId, event.sender.id),
  );

  ipcMain.handle(
    DEEP_AGENT_CHANNELS.deleteThread,
    (_event: IpcMainInvokeEvent, request: DeleteDeepAgentThreadRequest) =>
      service.deleteThread(request.chatId),
  );
}
