import { Component, inject } from '@angular/core';
import { ProfileService } from '../../../services/profile.service';
import { TranslatePipe } from '../translate.pipe';

@Component({
  selector: 'app-profile-avatar',
  imports: [TranslatePipe],
  templateUrl: './profile-avatar.html',
  styleUrl: './profile-avatar.scss',
})
export class ProfileAvatarComponent {
  private profileService = inject(ProfileService);
  readonly profilePhotoUrl = this.profileService.profilePhotoUrl;
}
