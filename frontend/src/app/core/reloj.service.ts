import { Injectable, signal } from '@angular/core';

/** Un solo temporizador para toda la app: todas las cuentas regresivas leen esta señal. */
@Injectable({ providedIn: 'root' })
export class RelojService {
  readonly ahora = signal(Date.now());

  constructor() {
    setInterval(() => this.ahora.set(Date.now()), 1000);
  }
}
