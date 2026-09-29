import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <main style="font-family: system-ui; padding: 2rem;">
      <h1>SubastaCampo</h1>
      <p>{{ estado() }}</p>
      <router-outlet />
    </main>
  `,
})
export class App {
  private http = inject(HttpClient);
  estado = signal('Conectando con el backend...');

  constructor() {
    this.http
      .get<{ status: string; database: string }>(`${environment.apiUrl}/health`)
      .subscribe({
        next: (r) => this.estado.set(`✅ Backend: ${r.status} · Base de datos: ${r.database}`),
        error: () => this.estado.set('❌ No se pudo conectar con el backend'),
      });
  }
}
