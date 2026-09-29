import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="barra">
      <a routerLink="/" class="marca">🌾 SubastaCampo</a>
      <nav>
        @if (auth.usuario(); as usuario) {
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

