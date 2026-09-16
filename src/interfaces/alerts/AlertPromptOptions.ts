import type { AlertConfirmOptions } from './AlertConfirmOptions';

export interface AlertPromptOptions extends AlertConfirmOptions {
  initialValue?: string;
  placeholder?: string;
  inputLabel?: string;
}
