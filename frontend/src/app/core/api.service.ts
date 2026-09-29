import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  EstadoSubasta,
  PrecioSugerido,
  Producto,
  ProductoCrear,
  Subasta,
  SubastaConProducto,
  SubastaCrear,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ---------- Subastas ----------
  listarSubastas(estado?: EstadoSubasta): Observable<SubastaConProducto[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<SubastaConProducto[]>(`${this.api}/subastas`, { params });
  }

  crearSubasta(datos: SubastaCrear): Observable<Subasta> {
    return this.http.post<Subasta>(`${this.api}/subastas`, datos);
  }

  // ---------- Productos ----------
  misProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos/mios`);
  }

  crearProducto(datos: ProductoCrear): Observable<Producto> {
    return this.http.post<Producto>(`${this.api}/productos`, datos);
  }

  // ---------- IA ----------
  precioSugerido(productoId: number): Observable<PrecioSugerido> {
    return this.http.get<PrecioSugerido>(`${this.api}/productos/${productoId}/precio-sugerido`);
  }
}
