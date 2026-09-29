import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { EventoSala } from './models';

export type EstadoConexion = 'conectando' | 'conectado' | 'reconectando' | 'no-encontrada';

/**
 * Maneja el WebSocket de UNA sala. Se provee por componente (no es global):
 * cada vez que se abre una sala nace una instancia, y muere al salir.
 */
@Injectable()
export class SalaSubastaService {
  readonly estadoConexion = signal<EstadoConexion>('conectando');

  private socket?: WebSocket;
  private intentos = 0;
  private cerradoAPropósito = false;
  private temporizador?: ReturnType<typeof setTimeout>;
  private alMensaje?: (evento: EventoSala) => void;

  conectar(subastaId: number, alMensaje: (evento: EventoSala) => void): void {
    this.alMensaje = alMensaje;
    this.cerradoAPropósito = false;
    this.abrir(subastaId);
  }

  desconectar(): void {
    this.cerradoAPropósito = true;
    clearTimeout(this.temporizador);
    this.socket?.close();
  }

  private abrir(subastaId: number): void {
    const socket = new WebSocket(`${environment.wsUrl}/ws/subastas/${subastaId}`);
    this.socket = socket;

    socket.onopen = () => {
      this.intentos = 0;
      this.estadoConexion.set('conectado');
    };

    // Cada mensaje es una macrotask: se procesa completo y de inmediato
    socket.onmessage = (e) => this.alMensaje?.(JSON.parse(e.data) as EventoSala);

    socket.onclose = (e) => {
      if (this.cerradoAPropósito) return;
      if (e.code === 4404) {
        this.estadoConexion.set('no-encontrada');
        return;
      }
      // Reconexión con espera creciente: 1s, 2s, 4s, 8s... hasta 10s
      this.estadoConexion.set('reconectando');
      const espera = Math.min(10_000, 1000 * 2 ** this.intentos++);
      this.temporizador = setTimeout(() => this.abrir(subastaId), espera);
    };
  }
}
