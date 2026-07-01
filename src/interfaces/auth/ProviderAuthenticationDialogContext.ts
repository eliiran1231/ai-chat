import type { ChatProvider } from '../ChatProvider';
import type { AuthUser } from './AuthUser';

export interface ProviderAuthenticationDialogContext {
  provider: ChatProvider;
  close(user?: AuthUser): void;
}
