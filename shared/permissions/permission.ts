export type PermissionDecision = 'approve' | 'deny';

export interface PermissionOperation {
  name: string;
  arguments: Readonly<Record<string, unknown>>;
}

export interface PermissionRequest {
  id: string;
  kind: string;
  title: string;
  description: string;
  resource: string;
  operation: PermissionOperation;
  createdAt: string;
}

export interface PermissionPolicyResult {
  request: PermissionRequest;
  canonicalOperation: PermissionOperation;
}

export interface PermissionPolicy {
  readonly kind: string;
  canonicalize(operation: PermissionOperation): Promise<PermissionPolicyResult>;
}

