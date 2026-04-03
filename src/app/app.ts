import { Component } from '@angular/core';
import { HomeComponent } from './home/home-component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
