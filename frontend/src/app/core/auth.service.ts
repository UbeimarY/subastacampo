import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegistroDatos, TokenRespuesta, Usuario } from './models';

export const CLAVE_TOKEN = 'subastacampo_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  readonly token = signal<string | null>(localStorage.getItem(CLAVE_TOKEN));
  readonly usuario = signal<Usuario | null>(null);
  readonly autenticado = computed(() => this.token() !== null);
  readonly esProductor = computed(() => this.usuario()?.rol === 'productor');

  constructor() {
    // Si al abrir la app ya había un token guardado, recupera los datos del usuario.
    // Si el token venció o es inválido, cierra la sesión.
    if (this.token()) {
      this.cargarUsuario().subscribe({ error: () => this.logout() });
    }
  }

  login(email: string, password: string): Observable<Usuario> {
    // FastAPI espera el login como formulario (OAuth2): username + password
    const cuerpo = new HttpParams().set('username', email).set('password', password);
    return this.http.post<TokenRespuesta>(`${this.api}/auth/login`, cuerpo).pipe(
      tap((respuesta) => this.guardarToken(respuesta.access_token)),
      switchMap(() => this.cargarUsuario()),
    );
  }

  registro(datos: RegistroDatos): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/auth/registro`, datos);
  }

  cargarUsuario(): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${this.api}/auth/me`)
      .pipe(tap((usuario) => this.usuario.set(usuario)));
  }

  logout(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    this.token.set(null);
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  private guardarToken(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
    this.token.set(token);
  }
}