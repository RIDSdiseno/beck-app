// types/beck.ts

export type TipoRegistro = "sello" | "junta";

export type EstadoRegistro =
  | "pendiente"
  | "instalado"
  | "observado"
  | "aprobado";

export interface Registro {
  id: number;
  tipo: TipoRegistro;
  obra: string;
  piso: string;
  equipo: string;
  estado: EstadoRegistro;
  usuario: string;
  fotoUrl?: string;
  fotoLocalUri?: string;
}
