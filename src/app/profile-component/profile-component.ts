import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon, LucideGlobe, LucideMonitor, LucideUserRound } from '@lucide/angular';
import { ProfileService } from '../../services/profile.service';
@Component({
  selector: 'app-profile-component',
  imports: [LucideDynamicIcon],
  templateUrl: './profile-component.html',
  changeDetection: ChangeDetectionStrategy.Default,
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
    ipValue: this.basicInfo.ip
  };
}
