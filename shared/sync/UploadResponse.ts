export type UploadOutcome = 'accepted' | 'retryable_error' | 'permanent_error';

export interface UploadResponse {
  outcome: UploadOutcome;
  error?: string;
}
