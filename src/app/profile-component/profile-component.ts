import { Component } from '@angular/core';
@Component({
  selector: 'app-profile-component',
  imports: [],
  templateUrl: './profile-component.html',
  styleUrl: './profile-component.scss',
})
export class ProfileComponent {
  readonly profile = {
    displayName: 'edit',
    nameLabel: 'name',
    nameValue: 'nice user',
    aboutLabel: 'about me',
    aboutValue: 'nice user',
    phoneLabel: 'phone number',
    phoneValue: '050-1234567',
    linksLabel: 'links',
    linksValue: 'Add links',
  };

  constructor(){
    
  }
}
