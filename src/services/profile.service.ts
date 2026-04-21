import { inject, Injectable } from '@angular/core';
import { BasicInfo } from '../interfaces/BasicInfo';
import { ElectronService } from './electron.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  public basicInfo: BasicInfo = {
    username: '',
    displayName: '',
    computerName: '',
    ip: '',
  };
  private electronService: ElectronService = inject(ElectronService);
  
  async loadBasicInfo(): Promise<BasicInfo> {
    if (this.basicInfo.username || this.basicInfo.computerName || this.basicInfo.ip) {
      return this.basicInfo;
    }
    if (!this.electronService.isElectronAvailable()) {
      return this.basicInfo;
    }

    try {
      this.basicInfo = await this.electronService.invoke<BasicInfo>('system:getBasicInfo');
    } catch (error) {
      console.warn('Unable to load system basic info via Electron:', error);
    }

    return this.basicInfo;
  }
}
