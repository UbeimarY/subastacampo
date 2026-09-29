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