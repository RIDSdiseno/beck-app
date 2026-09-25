import { authenticatedFetch } from "./authenticatedFetch";
import { API_BASE_URL, readJsonResponse } from "./config";
import { getSession, type SessionUser } from "../auth/session";

export const puedeConsultarInventarioAdmin = (user: SessionUser | null) => user?.rol === "administrador" && user.empresa === "beck";
export type ObraInventarioAdmin = { id: string; nombre: string; codigo: string; estado: string };
type Persona = { id: string; nombre: string };
export type AsignacionAdmin = {
  id: string; tipo: "epp" | "implemento" | "herramienta"; cantidad: number;
  nombre: string; sku: string | null; detalle: string; estado: string;
  entregadoPor: Persona; supervisor: Persona; operario: Persona | null;
  subSkus: string[]; fecha: string; entregadoOperarioAt: string | null; devueltoAt: string | null;
  recepcionConfirmadaAt: string | null; devolucionPendiente: boolean; devolucionMotivo: string | null; observacion: string | null;
  ultimoConsumo: { id: string; estado: string; cantidad: number; observacion: string | null; motivo_rechazo: string | null; solicitado_at: string; resuelto_at: string | null } | null;
};
export type ResumenInventarioAdmin = { conSupervisores: number; conOperarios: number; devueltas: number; consumidas: number; supervisores: number; operarios: number };
export type PaginaInventarioAdmin = { items: AsignacionAdmin[]; nextCursor: string | null; resumen?: ResumenInventarioAdmin };
export type EventoInventarioAdmin = { id: string; accion: string; cantidad: number; detalle: string | null; fecha: string; actor: string; supervisor: string; operario: string | null };
export type TrazabilidadAdmin = { items: EventoInventarioAdmin[]; page: number; hasMore: boolean };
export async function consultarInventarioAdmin<T>(path: string, signal?: AbortSignal): Promise<T> {
  const session = await getSession();
  if (!session.token || !puedeConsultarInventarioAdmin(session.user)) throw new Error("Acceso exclusivo del administrador de BECK.");
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/inventario-beck${path}`, {
    signal, method: "GET", headers: { Authorization: `Bearer ${session.token}` },
  });
  const data = await readJsonResponse(response);
  if (!response.ok || !data?.success) throw new Error(data?.error || "No se pudo consultar el inventario.");
  return data.data as T;
}
