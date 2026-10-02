import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { API_BASE_URL, readJsonResponse } from "@/services/api/config";
import { getSession } from "@/services/auth/session";

async function getToken() {
  const session = await getSession();
  if (!session.token || session.user?.rol !== "administrador") {
    throw new Error("La sesión no tiene permisos de administrador");
  }
  return session.token;
}

export type AdminResumen = {
  total: number;
  pendientesSupervisor: number;
  enRevision: number;
  rechazados: number;
  validados: number;
  correcciones: number;
  accionesAdministrador: number;
};

export type ActividadAdministrador = {
  id: string;
  usuario_id: string;
  modulo: "operario" | "supervisor" | "ingenieria" | "administracion";
  accion: string;
  entidad_tipo?: string | null;
  entidad_id?: string | null;
  descripcion: string;
  metodo: string;
  ruta: string;
  created_at: string;
};

export type ActividadAdministradorPage = {
  items: ActividadAdministrador[];
  total: number;
  nextCursor: string | null;
};

export async function getAdminResumen(): Promise<AdminResumen> {
  const token = await getToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/resumen`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo cargar el resumen administrativo");
  }
  return result.data as AdminResumen;
}

export type PeriodoAvance = "hoy" | "semana" | "mes" | "todo";
export type ObraAvance = { id: string; nombre: string; codigo: string | null; estado: string };
export type GrupoAvance = { nombre: string; registros: number; sellos: number; metros: number };
export type AdminAvance = {
  obra: ObraAvance;
  periodo: PeriodoAvance;
  desde: string | null;
  hasta: string | null;
  resumen: { registros: number; pendientesSupervisor: number; enRevision: number; validados: number; correcciones: number };
  sellos: number;
  metros: number;
  pisosTotal: number;
  responsablesTotal: number;
  pisos: GrupoAvance[];
  responsables: GrupoAvance[];
  ultimos: {
    id: string; fecha: string; created_at: string; numero_sello: string; piso: string;
    nombre_sellador: string; estado: string; tipo_registro: string; es_correccion: boolean; devuelto_a_tecnico: boolean;
  }[];
};

async function fetchAvance<T>(path: string): Promise<T> {
  const session = await getSession();
  if (!session.token || session.user?.rol !== "administrador" || session.user?.empresa !== "beck") {
    throw new Error("Acceso exclusivo para administradores BECK");
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/avance-obras${path}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudo cargar el avance de las obras");
  return result.data as T;
}

export const getAdminAvanceObras = () => fetchAvance<ObraAvance[]>("/opciones");
export const getAdminAvance = (obraId: string, periodo: PeriodoAvance) =>
  fetchAvance<AdminAvance>(`?${new URLSearchParams({ obraId, periodo }).toString()}`);

export async function getAdminActividad(params: {
  cursor?: string | null;
  limit?: number;
  search?: string;
  fecha?: string;
  modulo?: string;
} = {}): Promise<ActividadAdministradorPage> {
  const token = await getToken();
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.fecha) query.set("fecha", params.fecha);
  if (params.modulo && params.modulo !== "todos") query.set("modulo", params.modulo);
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/actividad?${query.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo cargar la actividad administrativa");
  }
  return result.data as ActividadAdministradorPage;
}
