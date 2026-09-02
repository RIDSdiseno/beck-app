import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { API_BASE_URL, ensureArray, readJsonResponse } from "@/services/api/config";
import { getSession } from "@/services/auth/session";

export type TipoInventarioBeck = "epp" | "implemento" | "herramienta";

export type ObraInventario = {
  id: string;
  nombre: string;
  codigo?: string | null;
  estado: string;
};

export type PersonaInventario = {
  id: string;
  nombre: string;
  email: string;
};

export type ItemInventario = {
  itemId: string;
  tipoItem: TipoInventarioBeck;
  nombre: string;
  sku?: string | null;
  detalle?: string | null;
  talla?: string | null;
  color?: string | null;
  unidadMedida?: string | null;
};

export type ItemDisponible = ItemInventario & { disponible: number };

export type ItemEntregado = ItemInventario & {
  id: string;
  cantidad: number;
  observacion?: string | null;
  entregadoAt: string;
  recepcionConfirmadaAt?: string | null;
  devolucionSolicitadaAt?: string | null;
  devolucionMotivo?: string | null;
  trabajador: PersonaInventario;
};

export type ItemMiEquipo = ItemInventario & {
  id: string;
  cantidad: number;
  observacion?: string | null;
  entregadoAt: string;
  recepcionConfirmadaAt?: string | null;
  devolucionSolicitadaAt?: string | null;
  devolucionMotivo?: string | null;
  obra: ObraInventario;
  supervisor: PersonaInventario;
};

export type EventoTrazabilidad = {
  id: string;
  accion: string;
  cantidad: number;
  detalle?: string | null;
  datos?: unknown;
  created_at: string;
  usuarios_trazabilidad_inventario_beck_actor_idTousuarios: {
    id: string;
    nombre: string;
    rol: string;
  };
  usuarios_trazabilidad_inventario_beck_trabajador_idTousuarios?: {
    id: string;
    nombre: string;
  } | null;
};

export type EventoHistorialEquipo = ItemInventario & {
  id: string;
  asignacionId: string;
  obra: ObraInventario;
  accion: string;
  cantidad: number;
  detalleEvento?: string | null;
  fecha: string;
  actor: { id: string; nombre: string; rol: string };
};

export type ResultadoEscaneoInventario = ItemInventario & {
  saldoBodega: number | null;
  custodios: {
    asignacionId: string;
    cantidad: number;
    obra: ObraInventario;
    custodio: { id: string; nombre: string; rol: "operario" | "supervisor" };
    supervisor: { id: string; nombre: string };
    esMio: boolean;
  }[];
  disponibleSupervisorPorObra: {
    obra: ObraInventario;
    cantidad: number;
  }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getSession();
  if (!session.token) throw new Error("No hay sesión activa");

  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo completar la solicitud");
  }
  return result.data as T;
}

export async function getObrasInventarioSupervisor() {
  const data = await request<unknown>("/api/inventario-beck/supervisor/obras");
  return ensureArray<ObraInventario>(data, "Respuesta inválida al obtener las obras.");
}

export async function getInventarioDisponible(obraId: string) {
  const data = await request<unknown>(
    `/api/inventario-beck/supervisor/disponible?obraId=${encodeURIComponent(obraId)}`,
  );
  return ensureArray<ItemDisponible>(data, "Respuesta inválida al obtener el inventario.");
}

export async function getInventarioEntregado(obraId: string) {
  const data = await request<unknown>(
    `/api/inventario-beck/supervisor/entregados?obraId=${encodeURIComponent(obraId)}`,
  );
  return ensureArray<ItemEntregado>(data, "Respuesta inválida al obtener las entregas.");
}

export async function getOperariosInventario(obraId: string) {
  const data = await request<unknown>(
    `/api/inventario-beck/supervisor/operarios?obraId=${encodeURIComponent(obraId)}`,
  );
  return ensureArray<PersonaInventario>(data, "Respuesta inválida al obtener los operarios.");
}

export async function asignarInventario(input: {
  obraId: string;
  trabajadorId: string;
  observacion?: string;
  lineas: { tipoItem: TipoInventarioBeck; itemId: string; cantidad: number }[];
}) {
  return request<{ ids: string[]; cantidadLineas: number }>(
    "/api/inventario-beck/supervisor/asignaciones",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function getMiEquipo() {
  const data = await request<unknown>("/api/inventario-beck/operario/asignaciones");
  return ensureArray<ItemMiEquipo>(data, "Respuesta inválida al obtener tu equipo.");
}

export async function confirmarRecepcionInventario(asignacionId: string) {
  return request<{ yaConfirmada: boolean; confirmadaAt?: string }>(
    `/api/inventario-beck/operario/asignaciones/${encodeURIComponent(asignacionId)}/confirmar-recepcion`,
    { method: "POST", body: "{}" },
  );
}

export async function solicitarDevolucionInventario(asignacionId: string, motivo?: string) {
  return request<{ yaSolicitada: boolean; solicitadaAt?: string }>(
    `/api/inventario-beck/operario/asignaciones/${encodeURIComponent(asignacionId)}/solicitar-devolucion`,
    { method: "POST", body: JSON.stringify({ motivo }) },
  );
}

export async function recibirDevolucionInventario(asignacionId: string) {
  return request<{ recibidaAt: string }>(
    `/api/inventario-beck/supervisor/asignaciones/${encodeURIComponent(asignacionId)}/recibir-devolucion`,
    { method: "POST", body: "{}" },
  );
}

export async function devolverInventarioABodega(input: {
  obraId: string;
  tipoItem: TipoInventarioBeck;
  itemId: string;
  cantidad: number;
  motivo?: string;
}) {
  return request<{ ids: string[]; cantidad: number }>(
    "/api/inventario-beck/supervisor/devoluciones-bodega",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function getTrazabilidadInventario(asignacionId: string) {
  const data = await request<unknown>(
    `/api/inventario-beck/asignaciones/${encodeURIComponent(asignacionId)}/trazabilidad`,
  );
  return ensureArray<EventoTrazabilidad>(data, "Respuesta inválida al obtener la trazabilidad.");
}

export async function getTrazabilidadItemInventario(input: {
  obraId: string;
  tipoItem: TipoInventarioBeck;
  itemId: string;
}) {
  const params = new URLSearchParams({
    obraId: input.obraId,
    tipoItem: input.tipoItem,
    itemId: input.itemId,
  });
  const data = await request<unknown>(
    `/api/inventario-beck/supervisor/trazabilidad-item?${params.toString()}`,
  );
  return ensureArray<EventoTrazabilidad>(data, "Respuesta inválida al obtener la trazabilidad.");
}

export async function getHistorialMiEquipo() {
  const data = await request<unknown>("/api/inventario-beck/operario/historial");
  return ensureArray<EventoHistorialEquipo>(data, "Respuesta inválida al obtener el historial.");
}

export async function getInventarioPorCodigo(codigo: string) {
  return request<{ codigo: string; resultados: ResultadoEscaneoInventario[] }>(
    `/api/inventario-beck/supervisor/codigo/${encodeURIComponent(codigo.trim())}`,
  );
}
