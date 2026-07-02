import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/node';
import type { AuthenticationService } from '../interfaces/auth/AuthenticationService.js';
import type { BlockedUpload } from '../shared/sync/SyncState.js';
import type { UploadResponse } from '../shared/sync/UploadResponse.js';

const backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3001';

interface TokenResponse {
  token: string;
  powersync_url: string;
}

export class PowerSyncConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly reportBlockedUpload: (upload: BlockedUpload | undefined) => void = () => {},
  ) {}

  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const accessToken = await this.authentication.getAccessToken();
    const response = await fetch(`${backendUrl}/api/auth/powersync-token`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Could not fetch PowerSync credentials (${response.status}).`);

    const credentials = (await response.json()) as TokenResponse;
    return { endpoint: credentials.powersync_url, token: credentials.token };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const accessToken = await this.authentication.getAccessToken();
    const response = await fetch(`${backendUrl}/api/powersync/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: transaction.crud.map((operation) => ({
          id: operation.id,
          op: operation.op,
          table: operation.table,
          opData: operation.opData,
        })),
      }),
    });

    if (!response.ok) throw new Error(`PowerSync upload failed (${response.status}).`);
    const result = (await response.json()) as UploadResponse;
    if (result.outcome === 'accepted') {
      this.reportBlockedUpload(undefined);
      await transaction.complete();
      return;
    }

    const message = result.error ?? 'Unknown upload error';
    if (result.outcome === 'permanent_error') {
      this.reportBlockedUpload({
        operationIds: transaction.crud.map((operation) => operation.id),
        message,
      });
      throw new Error(`PowerSync upload is permanently blocked: ${message}`);
    }

    throw new Error(`PowerSync upload should be retried: ${message}`);
  }
}
