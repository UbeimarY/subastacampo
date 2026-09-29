import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { esUrgente, etiquetaCategoria, tiempoRestante } from '../../core/formato';
import { EventoSala, Puja, Subasta, SubastaConProducto } from '../../core/models';
import { RelojService } from '../../core/reloj.service';
import { SalaSubastaService } from '../../core/sala-subasta.service';

@Component({
  selector: 'app-sala-subasta',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink],
  providers: [SalaSubastaService],
  template: `
    <div class="superior">
      <a routerLink="/" class="volver">← Volver a subastas</a>
      <span class="conexion" [attr.data-estado]="sala.estadoConexion()">
        @switch (sala.estadoConexion()) {
          @case ('conectado') { ● En vivo }
          @case ('conectando') { ○ Conectando... }
          @case ('reconectando') { ◌ Conexión perdida, reconectando... }
          @case ('no-encontrada') { ✕ Subasta no encontrada }
        }
      </span>
    </div>

    @if (sala.estadoConexion() === 'no-encontrada') {
      <p class="vacio">Esta subasta no existe.</p>
    } @else if (subasta(); as s) {
      <div class="sala">
        <section class="principal">
          <span class="categoria">{{ etiquetaCategoria(s.producto.categoria) }}</span>
          <h2>{{ s.producto.nombre }}</h2>
          @if (s.producto.descripcion) {
            <p class="descripcion">{{ s.producto.descripcion }}</p>
          }
          <p class="detalle">
            {{ s.producto.cantidad | number: '1.0-2' }} {{ s.producto.unidad }}
            · {{ s.producto.dias_restantes }} días de vida útil
          </p>

          <div class="marcador" [class.urgente]="activa() && esUrgente(s.fecha_fin, reloj.ahora())">
            <div>
              <p class="etiqueta">
                {{ pujas().length === 0 ? 'Precio inicial' : activa() ? 'Precio actual' : 'Precio final' }}
              </p>
              <p class="precio">{{ s.precio_actual | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>
              <p class="etiqueta">{{ pujas().length }} {{ pujas().length === 1 ? 'puja' : 'pujas' }}</p>
            </div>
            @if (activa()) {
              <div class="reloj">
                <p class="etiqueta">Cierra en</p>
                <p class="cuenta">{{ tiempoRestante(s.fecha_fin, reloj.ahora()) }}</p>
                @if (s.extensiones > 0) {
                  <p class="etiqueta">Extendida {{ s.extensiones }} {{ s.extensiones === 1 ? 'vez' : 'veces' }}</p>
                }
              </div>
            }
          </div>

          @if (s.estado === 'finalizada') {
            @if (s.ganador_id && s.ganador_id === auth.usuario()?.id) {
              <div class="banner ganaste">
                🎉 ¡Ganaste esta subasta por {{ s.precio_actual | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}!
              </div>
            } @else if (s.ganador_id) {
              <div class="banner">
                Subasta finalizada. Vendida por {{ s.precio_actual | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}.
              </div>
            } @else {
              <div class="banner">Subasta finalizada sin pujas.</div>
            }
          }

          @if (activa()) {
            @if (esComprador()) {
              <div class="pujar">
                @if (voyGanando()) {
                  <p class="ganando">🏆 Vas ganando</p>
                }
                <p class="etiqueta">Puja mínima: {{ minimo() | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>
                <div class="rapidas">
                  @for (opcion of opcionesRapidas(); track opcion) {
                    <button type="button" class="opcion" (click)="montoControl.setValue(opcion)">
                      {{ opcion | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
                    </button>
                  }
                </div>
                <div class="enviar">
                  <input type="number" [formControl]="montoControl" [min]="minimo()" step="100" aria-label="Monto de la puja" />
                  <button (click)="pujar()" [disabled]="enviando() || sala.estadoConexion() !== 'conectado'">
                    {{ enviando() ? 'Enviando...' : 'Pujar' }}
                  </button>
                </div>
                @if (error()) {
                  <p class="error">{{ error() }}</p>
                }
              </div>
            } @else if (esDueno()) {
              <p class="nota">Eres el productor de esta subasta. Aquí ves las pujas en vivo y el nivel de riesgo de cada una.</p>
            } @else {
              <p class="nota">Solo los compradores pueden pujar.</p>
            }
          }
        </section>

        <aside class="historial">
          <h3>Historial de pujas</h3>
          @if (latenciaMs() !== null) {
            <p class="latencia">Última puja recibida {{ latenciaMs() }} ms después de registrarse</p>
          }
          <ol>
            @for (p of pujas(); track p.id) {
              <li [class.nueva]="destacada() === p.id" [class.mia]="p.usuario_id === auth.usuario()?.id">
                <div class="fila">
                  <strong>{{ p.monto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
                  <span class="hora">{{ p.creado_en | date: 'HH:mm:ss' }}</span>
                </div>
                <div class="marcas">
                  @if (p.usuario_id === auth.usuario()?.id) {
                    <span class="marca tu">Tú</span>
                  } @else {
                    <span class="marca">Comprador #{{ p.usuario_id }}</span>
                  }
                  @if (p.extendio_cierre) {
                    <span class="marca">⏱ extendió el cierre</span>
                  }
                  @if (esDueno() && p.nivel_riesgo !== 'bajo') {
                    <span class="riesgo" [attr.data-nivel]="p.nivel_riesgo">
                      ⚠ Riesgo {{ p.nivel_riesgo }} ({{ p.riesgo }})
                    </span>
                  }
                </div>
                @if (esDueno() && p.motivos_riesgo) {
                  <p class="motivos">{{ p.motivos_riesgo }}</p>
                }
              </li>
            } @empty {
              <li class="sin-pujas">Todavía no hay pujas.</li>
            }
          </ol>
        </aside>
      </div>
    } @else {
      <p class="vacio">Cargando la sala...</p>
    }
  `,
  styles: `
    .superior { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .volver { text-decoration: none; font-weight: 600; }
    .conexion { font-size: 0.85rem; font-weight: 600; color: var(--gris); }
    .conexion[data-estado='conectado'] { color: var(--verde); }
    .conexion[data-estado='reconectando'] { color: #b45309; }
    .conexion[data-estado='no-encontrada'] { color: var(--error); }

    .sala { display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem; align-items: start; }
    @media (max-width: 760px) { .sala { grid-template-columns: 1fr; } }

    .principal, .historial {
      background: #fff; border: 1px solid var(--borde); border-radius: var(--radio); padding: 1.5rem;
    }
    h2 { margin: 0.5rem 0 0.25rem; }
    .categoria {
      font-size: 0.8rem; font-weight: 600; color: var(--verde);
      background: #e8f0e9; padding: 0.15rem 0.6rem; border-radius: 999px;
    }
    .descripcion { margin: 0.25rem 0; }
    .detalle, .etiqueta { margin: 0; color: var(--gris); font-size: 0.9rem; }

    .marcador {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
      margin: 1.25rem 0; padding: 1.25rem; background: var(--tierra); border-radius: 8px;
      border: 2px solid transparent; transition: border-color 0.3s;
    }
    .marcador.urgente { border-color: #d97706; }
    .precio { margin: 0.2rem 0; font-size: 2.2rem; font-weight: 800; }
    .reloj { text-align: right; }
    .cuenta { margin: 0.2rem 0; font-size: 2.2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .urgente .cuenta { color: #b45309; }

    .banner { padding: 1rem; border-radius: 8px; background: #eee; font-weight: 600; text-align: center; }
    .banner.ganaste { background: #e8f0e9; color: var(--verde-oscuro); font-size: 1.15rem; }

    .pujar { display: flex; flex-direction: column; gap: 0.6rem; }
    .ganando { margin: 0; font-weight: 700; color: var(--verde); }
    .rapidas { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .opcion { background: #fff; color: var(--verde); border: 1px solid var(--verde); font-size: 0.9rem; }
    .opcion:hover:not(:disabled) { background: var(--tierra); }
    .enviar { display: flex; gap: 0.5rem; }
    .enviar input { flex: 1; font-size: 1.1rem; }
    .nota { color: var(--gris); font-style: italic; }

    .historial h3 { margin-top: 0; }
    .latencia { margin: -0.5rem 0 0.75rem; font-size: 0.8rem; color: var(--gris); }
    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; max-height: 480px; overflow-y: auto; }
    li { padding: 0.6rem 0.75rem; border: 1px solid var(--borde); border-radius: 8px; }
    li.mia { border-color: var(--verde); }
    li.nueva { animation: destello 1.2s ease-out; }
    @keyframes destello { from { background: #fff3c4; } to { background: #fff; } }
    .fila { display: flex; justify-content: space-between; align-items: baseline; }
    .hora { font-size: 0.8rem; color: var(--gris); font-variant-numeric: tabular-nums; }
    .marcas { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.3rem; }
    .marca { font-size: 0.75rem; color: var(--gris); background: var(--tierra); padding: 0.1rem 0.45rem; border-radius: 999px; }
    .marca.tu { color: #fff; background: var(--verde); }
    .riesgo { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 999px; }
    .riesgo[data-nivel='medio'] { background: #fef3c7; color: #92400e; }
    .riesgo[data-nivel='alto'] { background: #fde2e1; color: var(--error); }
    .motivos { margin: 0.35rem 0 0; font-size: 0.8rem; color: var(--gris); }
    .sin-pujas, .vacio { text-align: center; color: var(--gris); border: none; padding: 1.5rem; }
  `,
})
export class SalaSubasta {
  auth = inject(AuthService);
  reloj = inject(RelojService);
  sala = inject(SalaSubastaService);
  private api = inject(ApiService);
  private subastaId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  tiempoRestante = tiempoRestante;
  esUrgente = esUrgente;
  etiquetaCategoria = etiquetaCategoria;

  // ---------- Estado de la sala ----------
  subasta = signal<SubastaConProducto | null>(null);
  pujas = signal<Puja[]>([]); // ordenadas de la más reciente a la más antigua
  destacada = signal<number | null>(null);
  latenciaMs = signal<number | null>(null);

  // ---------- Formulario de puja ----------
  montoControl = new FormControl(0, { nonNullable: true });
  enviando = signal(false);
  error = signal<string | null>(null);

  // ---------- Valores derivados (se recalculan solos) ----------
  activa = computed(() => this.subasta()?.estado === 'activa');
  esComprador = computed(() => this.auth.usuario()?.rol === 'comprador');
  esDueno = computed(() => {
    const s = this.subasta();
    const u = this.auth.usuario();
    return !!s && !!u && s.producto.productor_id === u.id;
  });
  voyGanando = computed(() => {
    const ultima = this.pujas()[0];
    return !!ultima && ultima.usuario_id === this.auth.usuario()?.id;
  });
  minimo = computed(() => {
    const s = this.subasta();
    if (!s) return 0;
    return this.pujas().length === 0
      ? Number(s.precio_inicial)
      : Number(s.precio_actual) + Number(s.incremento_minimo);
  });
  opcionesRapidas = computed(() => {
    const s = this.subasta();
    if (!s) return [];
    const incremento = Number(s.incremento_minimo);
    return [0, 1, 4].map((k) => this.minimo() + k * incremento);
  });

  constructor() {
    this.sala.conectar(this.subastaId, (evento) => this.alRecibir(evento));
    inject(DestroyRef).onDestroy(() => this.sala.desconectar());

    // Si otro comprador pujó y mi monto quedó por debajo del nuevo mínimo, se ajusta solo
    effect(() => {
      const min = this.minimo();
      if (this.montoControl.value < min) this.montoControl.setValue(min);
    });
  }

  /**
   * RETO DEL EVENT LOOP. Cada mensaje del WebSocket llega como una macrotask.
   * 1) Los DATOS se aplican de inmediato y de forma síncrona, en esta misma tarea:
   *    la puja nunca queda en cola detrás de trabajo visual.
   * 2) Lo VISUAL (resaltar la puja) se agenda con requestAnimationFrame,
   *    que corre justo antes del siguiente pintado sin quitarle turno a otros mensajes.
   */
  private alRecibir(evento: EventoSala): void {
    switch (evento.tipo) {
      case 'estado_inicial': {
        // Llega al conectar y al RECONECTAR: resincroniza todo, así no se pierde ninguna puja
        const { pujas, ...subasta } = evento.subasta;
        this.subasta.set(subasta);
        this.pujas.set([...pujas].sort((a, b) => b.id - a.id));
        break;
      }
      case 'nueva_puja':
        this.aplicarPuja(evento.puja, evento.subasta);
        this.latenciaMs.set(Math.max(0, Date.now() - new Date(evento.puja.creado_en).getTime()));
        requestAnimationFrame(() => this.resaltar(evento.puja.id));
        break;
      case 'subasta_finalizada':
        this.subasta.update((s) => (s ? { ...s, ...evento.subasta } : s));
        break;
    }
  }

  private aplicarPuja(puja: Puja, subasta: Subasta): void {
    const lista = this.pujas();
    if (lista.some((p) => p.id === puja.id)) return; // duplicada: se ignora

    const esLaMasReciente = lista.length === 0 || puja.id > lista[0].id;
    this.pujas.set([puja, ...lista].sort((a, b) => b.id - a.id));

    // Un evento viejo que llegue tarde entra al historial, pero NO pisa el estado actual
    if (esLaMasReciente) {
      this.subasta.update((s) => (s ? { ...s, ...subasta } : s));
    }
  }

  private resaltar(pujaId: number): void {
    this.destacada.set(pujaId);
    setTimeout(() => {
      if (this.destacada() === pujaId) this.destacada.set(null);
    }, 1200);
  }

  pujar(): void {
    const monto = this.montoControl.value;
    if (monto < this.minimo()) {
      this.error.set('El monto está por debajo de la puja mínima');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    // La respuesta HTTP solo confirma; el estado se actualiza por el WebSocket,
    // igual que para todos los demás compradores.
    this.api.pujar(this.subastaId, monto).subscribe({
      next: () => this.enviando.set(false),
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(
          e.status === 400 ? 'Alguien pujó antes que tú. Revisa el nuevo mínimo e inténtalo de nuevo.'
          : e.status === 409 ? 'La subasta ya finalizó.'
          : e.status === 403 ? 'Solo los compradores pueden pujar.'
          : 'No se pudo registrar la puja.',
        );
      },
    });
  }
}
