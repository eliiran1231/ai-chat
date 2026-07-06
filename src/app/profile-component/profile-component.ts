import { Component, inject } from '@angular/core';
import { LucideDynamicIcon, LucideGlobe, LucideMonitor, LucideUserRound } from '@lucide/angular';
import { ProfileService } from '../../services/profile.service';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';

@Component({
  selector: 'app-profile-component',
  imports: [LucideDynamicIcon, ProfileAvatarComponent],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.scss',
})
export class ProfileComponent {
  private profileService: ProfileService = inject(ProfileService);
  private readonly basicInfo = this.profileService.basicInfo;
  readonly usernameIcon = LucideUserRound;
  readonly computerNameIcon = LucideMonitor;
  readonly ipIcon = LucideGlobe;
  readonly profile = {
    displayName: this.basicInfo.displayName,
    usernameLabel: 'user name',
    usernameValue: this.basicInfo.username,
    computerNameLabel: 'computer name',
    computerNameValue: this.basicInfo.computerName,
    ipLabel: 'ip address',
    ipValue: this.basicInfo.ip,
  };
}
