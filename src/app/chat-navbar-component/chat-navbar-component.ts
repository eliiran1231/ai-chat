import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-navbar-component',
  imports: [],
  templateUrl: './chat-navbar-component.html',
  styleUrl: './chat-navbar-component.scss',
})
export class ChatNavbarComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
}
