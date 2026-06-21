import { Component, inject } from '@angular/core';
import { Globe, LucideAngularModule, Monitor, UserRound } from 'lucide-angular';
import { ProfileService } from '../../services/profile.service';
@Component({
  selector: 'app-profile-component',
  imports: [LucideAngularModule],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.scss',
})
export class ProfileComponent {
  private profileService: ProfileService = inject(ProfileService);
  private readonly basicInfo = this.profileService.basicInfo;
  readonly usernameIcon = UserRound;
  readonly computerNameIcon = Monitor;
  readonly ipIcon = Globe;
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
