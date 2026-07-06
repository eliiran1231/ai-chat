import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { SETTINGS_SECTIONS, SettingsSectionKey } from './settings-data';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  readonly editIcon = LucidePenLine;
  readonly profileSettingsRows = this.profileService.profileSettingsRows;

  readonly sectionKey = toSignal(
    this.route.data.pipe(map((data) => data['section'] as SettingsSectionKey)),
    {
      initialValue: this.route.snapshot.data['section'] as SettingsSectionKey,
    },
  );

  readonly section = computed(() => {
    const sectionKey = this.sectionKey();

    if (!sectionKey) {
      return SETTINGS_SECTIONS['general'];
    }

    return SETTINGS_SECTIONS[sectionKey];
  });

  constructor() {
    void this.profileService.loadBasicInfo();
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!input || !file || !file.type.startsWith('image/')) {
      return;
    }

    void this.profileService.setProfilePhoto(file);
    input.value = '';
  }
}
