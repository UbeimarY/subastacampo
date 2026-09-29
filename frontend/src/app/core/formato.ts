const CATEGORIAS: Record<string, string> = {
  frutas: 'Frutas',
  hortalizas: 'Hortalizas',
  tuberculos: 'Tubérculos',
  granos: 'Granos',
  lacteos: 'Lácteos',
  otros: 'Otros',
};

export function etiquetaCategoria(categoria: string): string {
  return CATEGORIAS[categoria] ?? categoria;
}

export function msRestantes(fechaFin: string, ahora: number): number {
  return new Date(fechaFin).getTime() - ahora;
}

export function tiempoRestante(fechaFin: string, ahora: number): string {
  const ms = msRestantes(fechaFin, ahora);
  if (ms <= 0) return 'Cerrando...';
  const total = Math.floor(ms / 1000);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

/** Menos de 2 minutos: la zona donde se activa el anti-francotirador. */
export function esUrgente(fechaFin: string, ahora: number): boolean {
  const ms = msRestantes(fechaFin, ahora);
  return ms > 0 && ms <= 120_000;
}
