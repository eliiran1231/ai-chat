import { Component, computed, input } from '@angular/core';
import type { Avatar } from '../../../classes/Chat';

@Component({
  selector: 'app-chat-avatar',
  templateUrl: './chat-avatar.html',
  styleUrl: './chat-avatar.scss',
})
export class ChatAvatarComponent {
  readonly avatar = input<Avatar | null>(null);
  readonly label = input('');
  readonly alt = input('');

  readonly text = computed(() => {
    const avatar = this.avatar();

    if (avatar?.type === 'text' && avatar.value.trim()) {
      return avatar.value.trim().slice(0, 2).toUpperCase();
    }

    return this.initialsFromLabel(this.label()) || 'ME';
  });

  readonly imageSrc = computed(() => {
    const avatar = this.avatar();
    return avatar?.type === 'image' ? avatar.value : null;
  });

  private initialsFromLabel(label: string): string {
    const words = label.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      return '';
    }

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
}
