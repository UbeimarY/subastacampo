import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { PrecioSugerido, Producto, Subasta } from '../../core/models';

const DURACIONES = [
  { minutos: 5, etiqueta: '5 minutos (ideal para demostraciones)' },
  { minutos: 15, etiqueta: '15 minutos' },
  { minutos: 30, etiqueta: '30 minutos' },
  { minutos: 60, etiqueta: '1 hora' },
  { minutos: 180, etiqueta: '3 horas' },
  { minutos: 720, etiqueta: '12 horas' },
  { minutos: 1440, etiqueta: '24 horas' },
];

@Component({
  selector: 'app-crear-subasta',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <div class="panel">
      <div class="ia">
        <p class="ia-titulo">🤖 Sugerencia de la IA</p>

        @if (cargandoIa()) {
          <p class="ia-nota">Analizando el producto...</p>
        } @else if (sugerencia(); as s) {
          <p class="ia-precio">{{ s.precio_sugerido | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</p>
          <p class="ia-rango">
            Rango probable:
            {{ s.rango_min | currency: 'COP' : 'symbol-narrow' : '1.0-0' }} –
            {{ s.rango_max | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}
            · {{ s.precio_por_kg | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}/kg
          </p>
          @if (s.factores.length) {
            <ul>
              @for (factor of s.factores; track factor) {
                <li>{{ factor }}</li>
              }
            </ul>
          }
          <p class="ia-nota">
            Prellenamos el precio inicial con el mínimo del rango para atraer pujas:
            la competencia debería llevarlo hacia el valor esperado.
          </p>
        } @else if (errorIa()) {
          <p class="error">{{ errorIa() }}</p>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="enviar()">
        <label>
          Precio inicial (COP)
          <input type="number" formControlName="precio_inicial" min="1" step="100" />
        </label>
        <label>
          Incremento mínimo por puja (COP)
          <input type="number" formControlName="incremento_minimo" min="1" step="100" />
        </label>
        <label>
          Duración
          <select formControlName="duracion_minutos">
            @for (d of duraciones; track d.minutos) {
              <option [ngValue]="d.minutos">{{ d.etiqueta }}</option>
            }
          </select>
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="acciones">
          <button type="button" class="neutro" (click)="cancelar.emit()">Cancelar</button>
          <button type="submit" [disabled]="enviando() || cargandoIa()">
            {{ enviando() ? 'Creando...' : 'Iniciar subasta' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .panel {
      display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
      margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--borde);
    }
    @media (max-width: 700px) { .panel { grid-template-columns: 1fr; } }

    .ia { background: #eef5ef; border-radius: 8px; padding: 1rem; }
    .ia-titulo { margin: 0; font-weight: 700; color: var(--verde); }
    .ia-precio { margin: 0.5rem 0 0; font-size: 1.8rem; font-weight: 700; }
    .ia-rango { margin: 0.25rem 0; color: var(--gris); font-size: 0.9rem; }
    .ia ul { margin: 0.75rem 0; padding-left: 1.2rem; font-size: 0.9rem; }
    .ia li { margin-bottom: 0.25rem; }
    .ia-nota { margin: 0; font-size: 0.85rem; color: var(--gris); }

    .acciones { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .neutro { background: #fff; color: var(--texto); border: 1px solid var(--borde); }
    .neutro:hover:not(:disabled) { background: var(--tierra); }
  `,
})
export class CrearSubasta implements OnInit {
  producto = input.required<Producto>();
  creada = output<Subasta>();
  cancelar = output<void>();

  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  duraciones = DURACIONES;
  sugerencia = signal<PrecioSugerido | null>(null);
  cargandoIa = signal(true);
  errorIa = signal<string | null>(null);
  enviando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    precio_inicial: [0, [Validators.required, Validators.min(1)]],
    incremento_minimo: [1000, [Validators.required, Validators.min(1)]],
    duracion_minutos: [30, Validators.required],
  });

  ngOnInit(): void {
    this.api.precioSugerido(this.producto().id).subscribe({
      next: (s) => {
        this.sugerencia.set(s);
        this.prellenar(s);
        this.cargandoIa.set(false);
      },
      error: () => {
        this.errorIa.set('No se pudo obtener la sugerencia. Puedes fijar el precio manualmente.');
        this.cargandoIa.set(false);
      },
    });
  }

  private prellenar(s: PrecioSugerido): void {
    const esperado = Number(s.precio_sugerido);
    this.form.patchValue({
      precio_inicial: Number(s.rango_min),
      // ~2% del valor esperado, redondeado a miles, mínimo $1.000
      incremento_minimo: Math.max(1000, Math.round((esperado * 0.02) / 1000) * 1000),
    });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('El precio inicial y el incremento deben ser mayores a cero');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.api.crearSubasta({ producto_id: this.producto().id, ...this.form.getRawValue() }).subscribe({
      next: (subasta) => this.creada.emit(subasta),
      error: (e: HttpErrorResponse) => {
        this.error.set(
          e.status === 409 ? 'Este producto ya tiene una subasta activa'
          : e.status === 422 ? 'Revisa los valores del formulario'
          : 'No se pudo crear la subasta',
        );
        this.enviando.set(false);
      },
    });
  }
}
