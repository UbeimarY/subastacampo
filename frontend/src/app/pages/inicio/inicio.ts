import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { esUrgente, etiquetaCategoria, tiempoRestante } from '../../core/formato';
import { SubastaConProducto } from '../../core/models';
import { RelojService } from '../../core/reloj.service';

type Pestana = 'activa' | 'finalizada';

@Component({
  selector: 'app-inicio',
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  template: `
    <div class="encabezado">
      <div>
        <h2>Subastas</h2>
        @if (auth.usuario(); as usuario) {
          <p class="saludo">Hola, {{ usuario.nombre }}</p>
        }
      </div>
      <button class="secundario-claro" (click)="cargar()" [disabled]="cargando()">
        {{ cargando() ? 'Actualizando...' : '↻ Actualizar' }}
      </button>
    </div>

    <div class="pestanas">
      <button [class.activa]="pestana() === 'activa'" (click)="cambiar('activa')">En curso</button>
      <button [class.activa]="pestana() === 'finalizada'" (click)="cambiar('finalizada')">Finalizadas</button>
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="rejilla">
      @for (s of subastas(); track s.id) {
        <article class="subasta" [class.urgente]="s.estado === 'activa' && esUrgente(s.fecha_fin, reloj.ahora())">
          <div class="fila">
            <span class="categoria">{{ etiquetaCategoria(s.producto.categoria) }}</span>
            @if (s.extensiones > 0) {
              <span class="extendida" title="Se extendió por pujas de último momento">+{{ s.extensiones }} ext.</span>
            }
          </div>

          <h3>{{ s.producto.nombre }}</h3>
          <p class="detalle">
            {{ s.producto.cantidad | number: '1.0-2' }} {{ s.producto.unidad }}
            · {{ s.producto.dias_restantes }} días de vida útil
          </p>

          <p class="etiqueta">{{ s.estado === 'activa' ? 'Precio actual' : 'Precio final' }}</p>
          <p class="precio">{{ s.precio_actual | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>

          @if (s.estado === 'activa') {
            <p class="tiempo">⏱ {{ tiempoRestante(s.fecha_fin, reloj.ahora()) }}</p>
          } @else {
            <p class="tiempo">{{ s.ganador_id ? '🏆 Vendida' : 'Sin pujas' }}</p>
          }

          <a class="boton" [routerLink]="['/subastas', s.id]">Ver subasta</a>
        </article>
      } @empty {
        @if (!cargando()) {
          <p class="vacio">
            {{ pestana() === 'activa' ? 'No hay subastas en curso por ahora.' : 'Todavía no hay subastas finalizadas.' }}
          </p>
        }
      }
    </div>
  `,
  styles: `
    .encabezado { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    h2 { margin: 0; }
    .saludo { margin: 0.25rem 0 0; color: var(--gris); }

    .pestanas { display: flex; gap: 0.5rem; margin: 1.5rem 0; }
    .pestanas button { background: #fff; color: var(--texto); border: 1px solid var(--borde); }
    .pestanas button.activa { background: var(--verde); color: #fff; border-color: var(--verde); }

    .secundario-claro { background: #fff; color: var(--verde); border: 1px solid var(--verde); }
    .secundario-claro:hover:not(:disabled) { background: var(--tierra); }

    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

    .subasta {
      display: flex; flex-direction: column; gap: 0.35rem;
      padding: 1.25rem; background: #fff;
      border: 1px solid var(--borde); border-radius: var(--radio);
      transition: border-color 0.3s;
    }
    .subasta.urgente { border-color: #d97706; box-shadow: 0 0 0 1px #d97706; }
    .subasta h3 { margin: 0.25rem 0 0; }

    .fila { display: flex; justify-content: space-between; align-items: center; }
    .categoria {
      font-size: 0.8rem; font-weight: 600; color: var(--verde);
      background: #e8f0e9; padding: 0.15rem 0.6rem; border-radius: 999px;
    }
    .extendida { font-size: 0.75rem; font-weight: 600; color: #b45309; }

    .detalle, .etiqueta { margin: 0; color: var(--gris); font-size: 0.9rem; }
    .etiqueta { margin-top: 0.5rem; }
    .precio { margin: 0; font-size: 1.6rem; font-weight: 700; }
    .tiempo { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
    .urgente .tiempo { color: #b45309; }

    .boton {
      margin-top: 0.75rem; padding: 0.6rem; text-align: center;
      background: var(--verde); color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 600;
    }
    .boton:hover { background: var(--verde-oscuro); }

    .vacio { grid-column: 1 / -1; text-align: center; color: var(--gris); padding: 2rem; }
  `,
})
export class Inicio {
  auth = inject(AuthService);
  reloj = inject(RelojService);
  private api = inject(ApiService);

  pestana = signal<Pestana>('activa');
  subastas = signal<SubastaConProducto[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  // Funciones de formato disponibles en la plantilla
  tiempoRestante = tiempoRestante;
  esUrgente = esUrgente;
  etiquetaCategoria = etiquetaCategoria;

  constructor() {
    this.cargar();
  }

  cambiar(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listarSubastas(this.pestana()).subscribe({
      next: (lista) => {
        this.subastas.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las subastas');
        this.cargando.set(false);
      },
    });
  }
}
