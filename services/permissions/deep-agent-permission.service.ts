import type { HITLRequest, HITLResponse } from 'langchain';
import type { Interrupt } from '@langchain/langgraph';
import type { PermissionOperation } from '../../shared/permissions/permission.js';
import { FilesystemReadPermissionPolicy } from './filesystem-read-permission.policy.js';
import { PermissionService } from './permission.service.js';

export interface DeepAgentPermissionGate {
  review(
    interrupts: readonly Interrupt[],
    signal: AbortSignal,
    onWaiting: () => void,
  ): Promise<HITLResponse>;
  dismiss(): void;
}

export class DeepAgentPermissionService implements DeepAgentPermissionGate {
  constructor(
    private readonly permissions: PermissionService,
    private readonly filesystemReadPolicy: FilesystemReadPermissionPolicy,
  ) {}

  async review(
    interrupts: readonly Interrupt[],
    signal: AbortSignal,
    onWaiting: () => void,
  ): Promise<HITLResponse> {
    const request = interrupts[0]?.value as HITLRequest | undefined;
    if (!request?.actionRequests?.length) throw new Error('INVALID_PERMISSION_INTERRUPT');

    const decisions: HITLResponse['decisions'] = [];
    for (const action of request.actionRequests) {
      if (signal.aborted) throw new Error('DEEP_AGENT_RUN_CANCELLED');
      const operation: PermissionOperation = { name: action.name, arguments: action.args };
      onWaiting();
      const result = await this.raceAbort(
        this.permissions.request(this.filesystemReadPolicy, operation),
        signal,
      );
      if (!result) {
        decisions.push({ type: 'reject', message: 'The user denied this permission request.' });
        continue;
      }

      // The renderer can only approve or deny. Electron supplies the canonical action.
      decisions.push({
        type: 'edit',
        editedAction: {
          name: result.canonicalOperation.name,
          args: { ...result.canonicalOperation.arguments },
        },
      });
    }
    return { decisions };
  }

  dismiss(): void {
    this.permissions.dismiss();
  }

  private async raceAbort<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        this.permissions.dismiss();
        reject(new Error('DEEP_AGENT_RUN_CANCELLED'));
      };
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      void pending.then(
        (value) => {
          signal.removeEventListener('abort', abort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      );
    });
  }
}

