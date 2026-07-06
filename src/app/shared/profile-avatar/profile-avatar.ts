import { Component, inject } from '@angular/core';
import { ProfileService } from '../../../services/profile.service';

@Component({
  selector: 'app-profile-avatar',
  templateUrl: './profile-avatar.html',
  styleUrl: './profile-avatar.scss',
})
export class ProfileAvatarComponent {
  private profileService = inject(ProfileService);
  readonly profilePhotoUrl = this.profileService.profilePhotoUrl;
}
