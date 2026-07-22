import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ChatProviderMetadata } from '../../interfaces/ChatProvider';
import { TranslatePipe } from '../shared/translate.pipe';

@Component({
  selector: 'app-provider-card',
  imports: [TranslatePipe],
  templateUrl: './provider-card-component.html',
  styleUrl: './provider-card-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderCardComponent {
  readonly metadata = input.required<ChatProviderMetadata>();
  readonly secondaryText = input.required<string>();
  readonly buttonText = input.required<string>();
  readonly disabled = input(false);
  readonly error = input<string>();
  readonly action = output<void>();
}
