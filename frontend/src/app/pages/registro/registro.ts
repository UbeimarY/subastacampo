import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Rol } from '../../core/models';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="tarjeta">
      <h2>Crear cuenta</h2>
      <form [formGroup]="form" (ngSubmit)="enviar()">
        <label>
          Nombre
          <input formControlName="nombre" autocomplete="name" />
        </label>
        <label>
          Email
          <input type="email" formControlName="email" autocomplete="email" />
        </label>
        <label>
          Contraseña <small>(mínimo 8 caracteres)</small>
          <input type="password" formControlName="password" autocomplete="new-password" />
        </label>
        <label>
          Soy...
          <select formControlName="rol">
            <option value="comprador">Comprador (restaurante, tienda, particular)</option>
            <option value="productor">Productor (vendo mi cosecha)</option>
          </select>
        </label>
        <label>
          Teléfono <small>(opcional)</small>
          <input type="tel" formControlName="telefono" autocomplete="tel" />
        </label>
        <label>
          Municipio <small>(opcional)</small>
          <input formControlName="municipio" />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <button type="submit" [disabled]="cargando()">
          {{ cargando() ? 'Creando cuenta...' : 'Registrarme' }}
        </button>
      </form>
      <p class="pie">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
    </section>
  `,
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: ['comprador' as Rol, Validators.required],
    telefono: [''],
    municipio: [''],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos: nombre, email válido y contraseña de al menos 8 caracteres');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const datos = this.form.getRawValue();

    // Registra y, si sale bien, inicia sesión automáticamente
    this.auth
      .registro({ ...datos, telefono: datos.telefono || null, municipio: datos.municipio || null })
      .pipe(switchMap(() => this.auth.login(datos.email, datos.password)))
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (e: HttpErrorResponse) => {
          this.error.set(
            e.status === 409 ? 'Ya existe una cuenta con ese email'
            : e.status === 422 ? 'Hay datos inválidos en el formulario'
            : 'No se pudo conectar con el servidor',
          );
          this.cargando.set(false);
        },
      });
  }
}
