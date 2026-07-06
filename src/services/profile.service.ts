import { computed, inject, Injectable, signal } from '@angular/core';
import { BasicInfo } from '../interfaces/BasicInfo';
import { ElectronService } from './electron.service';

const PROFILE_PHOTO_STORAGE_KEY = 'ai-chat-profile-photo';
const EMPTY_BASIC_INFO: BasicInfo = {
  username: '',
  displayName: '',
  computerName: '',
  ip: '',
};

export type ProfileRowId = 'computerName' | 'displayName' | 'ip' | 'username';

export interface ProfileRow {
  id: ProfileRowId;
  label: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private electronService: ElectronService = inject(ElectronService);

  readonly basicInfo = signal<BasicInfo>({ ...EMPTY_BASIC_INFO });
  readonly profilePhotoUrl = signal<string | null>(this.loadStoredProfilePhoto());
  readonly displayName = computed(() => this.basicInfo().displayName);
  readonly profileRows = computed<ProfileRow[]>(() => {
    const basicInfo = this.basicInfo();

    return [
      {
        id: 'username',
        label: 'user name',
        value: basicInfo.username,
      },
      {
        id: 'computerName',
        label: 'computer name',
        value: basicInfo.computerName,
      },
      {
        id: 'ip',
        label: 'ip address',
        value: basicInfo.ip,
      },
    ];
  });
  readonly profileSettingsRows = computed<ProfileRow[]>(() => [
    {
      id: 'displayName',
      label: 'Display name',
      value: this.displayName(),
    },
    ...this.profileRows(),
  ]);

  async loadBasicInfo(): Promise<BasicInfo> {
    const currentBasicInfo = this.basicInfo();

    if (currentBasicInfo.username || currentBasicInfo.computerName || currentBasicInfo.ip) {
      return currentBasicInfo;
    }

    if (!this.electronService.isElectronAvailable()) {
      return currentBasicInfo;
    }

    try {
      this.basicInfo.set(await this.electronService.invoke<BasicInfo>('system:getBasicInfo'));
    } catch (error) {
      console.warn('Unable to load system basic info via Electron:', error);
    }

    return this.basicInfo();
  }

  async setProfilePhoto(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      this.profilePhotoUrl.set(dataUrl);
      localStorage.setItem(PROFILE_PHOTO_STORAGE_KEY, dataUrl);
    } catch (error) {
      console.warn('Unable to save profile photo locally:', error);
    }
  }

  private loadStoredProfilePhoto(): string | null {
    try {
      return localStorage.getItem(PROFILE_PHOTO_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Unable to read profile photo.'));
      };
      reader.readAsDataURL(file);
    });
  }
}
