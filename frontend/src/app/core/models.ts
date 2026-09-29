export type Rol = 'productor' | 'comprador';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  municipio: string | null;
  creado_en: string;
}

export interface RegistroDatos {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  telefono: string | null;
  municipio: string | null;
}

export interface TokenRespuesta {
  access_token: string;
  token_type: string;
}

export type EstadoSubasta = 'programada' | 'activa' | 'finalizada' | 'cancelada';

export interface Producto {
  id: number;
  productor_id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  cantidad: string; // Decimal llega como texto desde FastAPI
  unidad: string;
  fecha_cosecha: string;
  vida_util_dias: number;
  creado_en: string;
  dias_restantes: number;
}

export interface Subasta {
  id: number;
  producto_id: number;
  precio_inicial: string;
  incremento_minimo: string;
  precio_actual: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoSubasta;
  extensiones: number;
  ganador_id: number | null;
}

export interface SubastaConProducto extends Subasta {
  producto: Producto;
}

export type Categoria = 'frutas' | 'hortalizas' | 'tuberculos' | 'granos' | 'lacteos' | 'otros';
export type Unidad = 'kg' | 'arroba' | 'bulto' | 'canastilla' | 'unidad';

export interface ProductoCrear {
  nombre: string;
  descripcion: string | null;
  categoria: Categoria;
  cantidad: number;
  unidad: Unidad;
  fecha_cosecha: string;
  vida_util_dias: number;
}

export interface SubastaCrear {
  producto_id: number;
  precio_inicial: number;
  incremento_minimo: number;
  duracion_minutos: number;
}

export interface PrecioSugerido {
  precio_sugerido: string;
  rango_min: string;
  rango_max: string;
  precio_por_kg: string;
  cantidad_kg: number;
  dias_restantes: number;
  demanda_categoria: number;
  factores: string[];
  modelo_version: string;
}

export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

export interface Puja {
  id: number;
  subasta_id: number;
  usuario_id: number;
  monto: string;
  creado_en: string;
  riesgo: number;
  motivos_riesgo: string | null;
  extendio_cierre: boolean;
  nivel_riesgo: NivelRiesgo;
}

export interface SubastaDetalle extends SubastaConProducto {
  pujas: Puja[];
}

/** Mensajes que envía el servidor por el WebSocket de la sala. */
export type EventoSala =
  | { tipo: 'estado_inicial'; subasta: SubastaDetalle }
  | { tipo: 'nueva_puja'; puja: Puja; subasta: Subasta }
  | { tipo: 'subasta_finalizada'; subasta: Subasta };
  