import { InjectionToken } from '@angular/core';
import { ProviderAuthenticationDialogContext } from '../../interfaces/auth/ProviderAuthenticationDialogContext';

export interface AnimatedDialogContext {
  close(result?: unknown): void;
}

export const ANIMATED_DIALOG_CONTEXT =
  new InjectionToken<AnimatedDialogContext>('ANIMATED_DIALOG_CONTEXT');

export const PROVIDER_AUTHENTICATION_DIALOG_CONTEXT =
  new InjectionToken<ProviderAuthenticationDialogContext>('PROVIDER_AUTHENTICATION_DIALOG_CONTEXT');
