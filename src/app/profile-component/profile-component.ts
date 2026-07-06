import { Component, inject } from '@angular/core';
import { LucideDynamicIcon, LucideGlobe, LucideMonitor, LucideUserRound } from '@lucide/angular';
import { ProfileRowId, ProfileService } from '../../services/profile.service';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';

@Component({
  selector: 'app-profile-component',
  imports: [LucideDynamicIcon, ProfileAvatarComponent],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.scss',
})
export class ProfileComponent {
  private profileService: ProfileService = inject(ProfileService);
  readonly displayName = this.profileService.displayName;
  readonly profileRows = this.profileService.profileRows;
  readonly rowIcons = {
    computerName: LucideMonitor,
    displayName: LucideUserRound,
    ip: LucideGlobe,
    username: LucideUserRound,
  };

  constructor() {
    void this.profileService.loadBasicInfo();
  }

  iconClass(rowId: ProfileRowId): string {
    return rowId === 'computerName'
      ? 'profile-card__icon profile-card__icon--info'
      : 'profile-card__icon';
  }
}
