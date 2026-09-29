import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { etiquetaCategoria } from '../../core/formato';
import { Categoria, Producto, Subasta, Unidad } from '../../core/models';
import { CrearSubasta } from './crear-subasta';

/** Fecha de hoy en formato YYYY-MM-DD, en hora local (no UTC). */
function hoy(): string {
  return new Date().toLocaleDateString('en-CA');
}

@Component({
  selector: 'app-mis-productos',
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink, CrearSubasta],
  template: `
    <div class="encabezado">
      <h2>Mis productos</h2>
      <button (click)="mostrarFormulario.set(!mostrarFormulario())">
        {{ mostrarFormulario() ? 'Cerrar formulario' : '+ Publicar cosecha' }}
      </button>
    </div>

    @if (exito(); as e) {
      <div class="aviso-exito">
        <span>
          ✅ {{ e.texto }}
          <a [routerLink]="['/subastas', e.subastaId]">Ver subasta</a>
        </span>
        <button class="cerrar" (click)="exito.set(null)" aria-label="Cerrar aviso">×</button>
      </div>
    }

    @if (mostrarFormulario()) {
      <section class="formulario">
        <h3>Publicar cosecha</h3>
        <form [formGroup]="form" (ngSubmit)="publicar()" class="rejilla-form">
          <label class="ancho">
            Nombre del producto
            <input formControlName="nombre" placeholder="Ej: Papa pastusa" />
          </label>
          <label class="ancho">
            Descripción <small>(opcional)</small>
            <textarea formControlName="descripcion" rows="2" placeholder="Calidad, variedad, lugar de entrega..."></textarea>
          </label>
          <label>
            Categoría
            <select formControlName="categoria">
              @for (c of categorias; track c) {
                <option [value]="c">{{ etiquetaCategoria(c) }}</option>
              }
            </select>
          </label>
          <label>
            Unidad
            <select formControlName="unidad">
              @for (u of unidades; track u) {
                <option [value]="u">{{ u }}</option>
              }
            </select>
          </label>
          <label>
            Cantidad
            <input type="number" formControlName="cantidad" min="0.01" step="0.01" />
          </label>
          <label>
            Fecha de cosecha
            <input type="date" formControlName="fecha_cosecha" [max]="hoy" />
          </label>
          <label>
            Vida útil (días)
            <input type="number" formControlName="vida_util_dias" min="1" max="365" />
          </label>

          @if (errorFormulario()) {
            <p class="error ancho">{{ errorFormulario() }}</p>
          }

          <button type="submit" class="ancho" [disabled]="publicando()">
            {{ publicando() ? 'Publicando...' : 'Publicar y ver precio sugerido' }}
          </button>
        </form>
      </section>
    }

    @if (cargando()) {
      <p class="vacio">Cargando tus productos...</p>
    } @else if (errorCarga()) {
      <p class="error">{{ errorCarga() }}</p>
    } @else {
      <div class="lista">
        @for (p of productos(); track p.id) {
          <article class="producto">
            <div class="fila">
              <div>
                <span class="categoria">{{ etiquetaCategoria(p.categoria) }}</span>
                <h3>{{ p.nombre }}</h3>
                <p class="detalle">
                  {{ p.cantidad | number: '1.0-2' }} {{ p.unidad }}
                  · cosechado el {{ p.fecha_cosecha }}
                  · {{ p.dias_restantes }} días de vida útil
                </p>
              </div>

              <div class="estado">
                @if (subastaActiva().get(p.id); as s) {
                  <span class="en-subasta">● En subasta</span>
                  <a [routerLink]="['/subastas', s.id]">Ver sala</a>
                } @else if (p.dias_restantes === 0) {
                  <span class="vencido">Vida útil agotada</span>
                } @else if (subastando() !== p.id) {
                  <button (click)="subastando.set(p.id)">Subastar</button>
                }
              </div>
            </div>

            @if (subastando() === p.id) {
              <app-crear-subasta
                [producto]="p"
                (creada)="alCrearSubasta(p, $event)"
                (cancelar)="subastando.set(null)"
              />
            }
          </article>
        } @empty {
          <p class="vacio">Aún no has publicado productos. Usa «+ Publicar cosecha» para empezar.</p>
        }
      </div>
    }
  `,
  styles: `
    .encabezado { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    h2 { margin: 0; }

    .aviso-exito {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      margin-bottom: 1rem; padding: 0.75rem 1rem;
      background: #e8f0e9; border: 1px solid #b9d3bd; border-radius: 8px;
    }
    .aviso-exito a { margin-left: 0.5rem; font-weight: 600; }
    .cerrar { background: transparent; color: var(--gris); padding: 0 0.4rem; font-size: 1.3rem; }
    .cerrar:hover:not(:disabled) { background: transparent; color: var(--texto); }

    .formulario, .producto {
      background: #fff; border: 1px solid var(--borde); border-radius: var(--radio); padding: 1.25rem;
    }
    .formulario { margin-bottom: 1.5rem; }
    .formulario h3 { margin-top: 0; }

    .rejilla-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .rejilla-form .ancho { grid-column: 1 / -1; }
    @media (max-width: 600px) { .rejilla-form { grid-template-columns: 1fr; } }

    textarea {
      padding: 0.65rem 0.75rem; border: 1px solid var(--borde); border-radius: 8px;
      font: inherit; resize: vertical;
    }

    .lista { display: flex; flex-direction: column; gap: 1rem; }
    .fila { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .producto h3 { margin: 0.4rem 0 0.2rem; }
    .categoria {
      font-size: 0.8rem; font-weight: 600; color: var(--verde);
      background: #e8f0e9; padding: 0.15rem 0.6rem; border-radius: 999px;
    }
    .detalle { margin: 0; color: var(--gris); font-size: 0.9rem; }

    .estado { display: flex; align-items: center; gap: 0.75rem; }
    .en-subasta { color: var(--verde); font-weight: 700; }
    .vencido { color: var(--gris); font-style: italic; }

    .vacio { text-align: center; color: var(--gris); padding: 2rem; }
  `,
})
export class MisProductos {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  etiquetaCategoria = etiquetaCategoria;
  hoy = hoy();
  categorias: Categoria[] = ['frutas', 'hortalizas', 'tuberculos', 'granos', 'lacteos', 'otros'];
  unidades: Unidad[] = ['kg', 'arroba', 'bulto', 'canastilla', 'unidad'];

  productos = signal<Producto[]>([]);
  subastaActiva = signal(new Map<number, Subasta>()); // producto_id → subasta activa
  cargando = signal(true);
  errorCarga = signal<string | null>(null);

  mostrarFormulario = signal(false);
  publicando = signal(false);
  errorFormulario = signal<string | null>(null);

  subastando = signal<number | null>(null); // id del producto con el panel de subasta abierto
  exito = signal<{ texto: string; subastaId: number } | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    categoria: ['tuberculos' as Categoria, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.01)]],
    unidad: ['bulto' as Unidad, Validators.required],
    fecha_cosecha: [hoy(), Validators.required],
    vida_util_dias: [15, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    // forkJoin: lanza ambas peticiones en paralelo y espera a que terminen las dos
    forkJoin({
      productos: this.api.misProductos(),
      activas: this.api.listarSubastas('activa'),
    }).subscribe({
      next: ({ productos, activas }) => {
        this.productos.set(productos);
        this.subastaActiva.set(new Map(activas.map((s) => [s.producto_id, s])));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar tus productos');
        this.cargando.set(false);
      },
    });
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorFormulario.set('Revisa los campos marcados en rojo');
      return;
    }
    this.publicando.set(true);
    this.errorFormulario.set(null);
    const datos = this.form.getRawValue();

    this.api.crearProducto({ ...datos, descripcion: datos.descripcion || null }).subscribe({
      next: (producto) => {
        this.productos.update((lista) => [producto, ...lista]);
        this.form.reset();
        this.mostrarFormulario.set(false);
        this.publicando.set(false);
        // Abre de inmediato el panel de subasta, con la sugerencia de la IA
        this.subastando.set(producto.id);
      },
      error: (e: HttpErrorResponse) => {
        this.errorFormulario.set(
          e.status === 422 ? 'Hay datos inválidos (¿la fecha de cosecha es futura?)'
          : 'No se pudo publicar el producto',
        );
        this.publicando.set(false);
      },
    });
  }

  alCrearSubasta(producto: Producto, subasta: Subasta): void {
    this.subastaActiva.update((mapa) => new Map(mapa).set(producto.id, subasta));
    this.subastando.set(null);
    this.exito.set({ texto: `La subasta de «${producto.nombre}» está en curso.`, subastaId: subasta.id });
  }
}
