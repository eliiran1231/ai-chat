import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HomeComponent } from './home/home-component';

@Component({
  selector: 'app-root',
  imports: [HomeComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './app.scss',
})
export class App {}
