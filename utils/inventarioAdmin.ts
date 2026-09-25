import type { AsignacionAdmin } from "@/services/api/inventarioAdminApi";

export function estadoAsignacionAdmin(item: Pick<AsignacionAdmin, "estado" | "devolucionPendiente" | "operario" | "recepcionConfirmadaAt" | "ultimoConsumo">) {
  if (item.estado === "consumido") return "Consumido";
  if (item.estado === "devuelto") return "Devuelto a bodega";
  if (item.ultimoConsumo?.estado === "pendiente") return "Consumo por confirmar";
  if (item.devolucionPendiente) return item.operario ? "Devolución al supervisor pendiente" : "Devolución a bodega pendiente";
  if (item.operario) return item.recepcionConfirmadaAt ? "En poder del operario" : "Recepción del operario pendiente";
  return "En poder del supervisor";
}
export const tipoArticuloAdmin = (tipo: string) => tipo === "epp" ? "EPP" : tipo === "implemento" ? "Implemento" : "Herramienta";
