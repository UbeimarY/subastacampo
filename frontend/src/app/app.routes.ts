import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, productorGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
    {
    path: 'mis-productos',
    canActivate: [authGuard, productorGuard],
    loadComponent: () => import('./pages/mis-productos/mis-productos').then((m) => m.MisProductos),
  },

    {
    path: 'subastas/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sala-subasta/sala-subasta').then((m) => m.SalaSubasta),
  },
  
  { path: '**', redirectTo: '' },
];