import { InjectionToken } from '@angular/core';
import { ProviderAuthenticationDialogContext } from '../../interfaces/auth/ProviderAuthenticationDialogContext';

export const PROVIDER_AUTHENTICATION_DIALOG_CONTEXT =
  new InjectionToken<ProviderAuthenticationDialogContext>('PROVIDER_AUTHENTICATION_DIALOG_CONTEXT');
