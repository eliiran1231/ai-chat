import { Routes } from '@angular/router';
import { HomeComponent } from './home/home-component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'chats',
        pathMatch: 'full'
    },
    {
        path: 'chats',
        component: HomeComponent
    },
    {
        path: 'chats/:id',
        component: HomeComponent
    }
];
