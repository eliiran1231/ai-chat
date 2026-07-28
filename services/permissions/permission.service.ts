import type {
  PermissionDecision,
  PermissionOperation,
  PermissionPolicy,
  PermissionPolicyResult,
  PermissionRequest,
} from '../../shared/permissions/permission.js';

export interface PermissionPresenter {
  present(request: PermissionRequest): Promise<PermissionDecision>;
  dismiss(): void;
}

export class PermissionService {
  private queue = Promise.resolve();

  constructor(private readonly presenter: PermissionPresenter) {}

  request(
    policy: PermissionPolicy,
    operation: PermissionOperation,
  ): Promise<PermissionPolicyResult | undefined> {
    const pending = this.queue.then(async () => {
      const canonical = await policy.canonicalize(operation);
      const decision = await this.presenter.present(canonical.request);
      return decision === 'approve' ? canonical : undefined;
    });
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  dismiss(): void {
    this.presenter.dismiss();
  }
}

