import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-inicio',
  template: `
    <section class="tarjeta">
      @if (auth.usuario(); as usuario) {
        <h2>Hola, {{ usuario.nombre }} 👋</h2>
        <p>
          Entraste como <strong>{{ usuario.rol }}</strong>
          @if (usuario.municipio) { desde {{ usuario.municipio }} }.
        </p>
        <p>Aquí aparecerán las subastas activas.</p>
      } @else {
        <p>Cargando tu información...</p>
      }
    </section>
  `,
})
export class Inicio {
  auth = inject(AuthService);
}
