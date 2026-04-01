import { Component } from '@angular/core';
import { ChatListComponent } from './chat-list/chat-list-component';

@Component({
  selector: 'app-root',
  imports: [ChatListComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
