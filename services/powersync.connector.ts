import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/node';
import type { AuthenticationService } from '../interfaces/auth/AuthenticationService.js';

const backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3001';

interface TokenResponse {
  token: string;
  powersync_url: string;
}

interface UploadResponse {
  success: boolean;
  error?: string;
}

export class PowerSyncConnector implements PowerSyncBackendConnector {
  constructor(private readonly authentication: AuthenticationService) {}

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
    if (!result.success) {
      throw new Error(`PowerSync upload was rejected: ${result.error ?? 'Unknown error'}`);
    }

    await transaction.complete();
  }
}
