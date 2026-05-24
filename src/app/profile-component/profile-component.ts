import { Component, inject } from '@angular/core';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Languages,
  LucideAngularModule,
  Monitor,
  UserRound,
} from 'lucide-angular';
import { ProfileService } from '../../services/profile.service';
import { AppLanguage, LanguageService } from '../../services/language.service';
@Component({
  selector: 'app-profile-component',
  imports: [LucideAngularModule],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.scss',
})
export class ProfileComponent {
  private profileService: ProfileService = inject(ProfileService);
  readonly language = inject(LanguageService);
  readonly usernameIcon = UserRound;
  readonly computerNameIcon = Monitor;
  readonly ipIcon = Globe;
  readonly languageIcon = Languages;
  readonly checkIcon = Check;
  readonly expandLanguageIcon = ChevronDown;
  readonly collapseLanguageIcon = ChevronUp;
  isLanguagePickerOpen = false;

  get displayName(): string {
    return this.profileService.basicInfo.displayName;
  }

  get username(): string {
    return this.profileService.basicInfo.username;
  }

  get computerName(): string {
    return this.profileService.basicInfo.computerName;
  }

  get ip(): string {
    return this.profileService.basicInfo.ip;
  }

  get currentLanguageLabel(): string {
    return this.languageLabel(this.language.language());
  }

  languageLabel(code: AppLanguage): string {
    return code === 'en' ? this.language.t('language.english') : this.language.t('language.hebrew');
  }

  toggleLanguagePicker(): void {
    this.isLanguagePickerOpen = !this.isLanguagePickerOpen;
  }

  selectLanguage(code: AppLanguage): void {
    this.language.setLanguage(code);
    this.isLanguagePickerOpen = false;
  }
}
