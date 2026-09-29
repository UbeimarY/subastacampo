import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="barra">
      <a routerLink="/" class="marca">🌾 SubastaCampo</a>
      <nav>
        @if (auth.usuario(); as usuario) {
          <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Subastas</a>
          @if (usuario.rol === 'productor') {
            <a routerLink="/mis-productos" routerLinkActive="activo">Mis productos</a>
          }
          <span class="usuario">
            {{ usuario.nombre }} <span class="insignia">{{ usuario.rol }}</span>
          </span>
          <button class="secundario" (click)="auth.logout()">Cerrar sesión</button>
        } @else if (!auth.autenticado()) {
          <a routerLink="/login">Ingresar</a>
          <a routerLink="/registro">Registrarme</a>
        }
      </nav>
    </header>
    <main class="contenido">
      <router-outlet />
    </main>
  `,
})
export class App {
  auth = inject(AuthService);
}
