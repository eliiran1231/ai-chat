import { Component, input, output } from '@angular/core';

import { SettingsRow } from './settings-data';

@Component({
  selector: 'app-settings-row',
  templateUrl: './settings-row.html',
  styleUrl: './settings-row.scss',
})
export class SettingsRowComponent {
  readonly row = input.required<SettingsRow>();
  readonly description = input.required<string>();
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly rangeValue = input(0);
  readonly selectValue = input('');

  readonly action = output<void>();
  readonly rangeApply = output<void>();
  readonly rangeInput = output<number>();
  readonly selectChange = output<string>();
  readonly toggleChange = output<boolean>();

  onToggleChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (input) {
      this.toggleChange.emit(input.checked);
    }
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;

    if (select) {
      this.selectChange.emit(select.value);
    }
  }

  onRangeInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (input) {
      this.rangeInput.emit(Number(input.value));
    }
  }
}
