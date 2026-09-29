import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstadoSubasta, SubastaConProducto } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  listarSubastas(estado?: EstadoSubasta): Observable<SubastaConProducto[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<SubastaConProducto[]>(`${this.api}/subastas`, { params });
  }
}
