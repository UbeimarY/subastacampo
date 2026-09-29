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