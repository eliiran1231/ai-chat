import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatProvider } from '../../interfaces/ChatProvider';
import { ANIMATED_DIALOG_CONTEXT } from '../animated-dialog-component/animated-dialog-context.token';
import { AnimatedDialogData } from '../animated-dialog-component/animated-dialog-component';
import { ProviderCardComponent } from '../provider-card-component/provider-card-component';
import { TranslatePipe } from '../shared/translate.pipe';

export interface ProviderSelectionDialogData extends AnimatedDialogData {
  providers: ChatProvider[];
}

@Component({
  selector: 'app-provider-selection-dialog',
  imports: [ProviderCardComponent, TranslatePipe],
  templateUrl: './provider-selection-dialog-component.html',
  styleUrl: './provider-selection-dialog-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderSelectionDialogComponent {
  readonly data = inject<ProviderSelectionDialogData>(DIALOG_DATA);
  private readonly dialog = inject(ANIMATED_DIALOG_CONTEXT);

  ngOnInit(): void {
    if(this.data.providers.length === 1) {
      this.selectProvider(this.data.providers[0]);
    }
  }

  selectProvider(provider: ChatProvider): void {
    this.dialog.close(provider);
  }
}
