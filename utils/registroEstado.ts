import type { RegistroHistorialApi } from "@/services/api/registrosApi";
import { formatTime24WithPeriod } from "@/utils/dateTime";

export const estadoColor = {
  pendiente: "#f59e0b",
  en_revision: "#3b82f6",
  validado: "#16a34a",
  rechazado: "#dc2626",
} as const;

export function getEstadoLabel(estado: RegistroHistorialApi["estado"]) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_revision":
      return "En revisión";
    case "validado":
      return "Validado";
    case "rechazado":
      return "Rechazado";
    default:
      return "Pendiente";
  }
}

export function formatShortDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const formattedDate = date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${formattedDate} ${formatTime24WithPeriod(value)}`;
}

export function isCorreccionEditable(registro: RegistroHistorialApi) {
  return (
    registro.estado === "pendiente" &&
    Boolean(registro.es_correccion) &&
    Boolean(registro.devuelto_a_tecnico)
  );
}

export function shouldShowRejectionContext(registro: RegistroHistorialApi) {
  return (
    registro.estado === "rechazado" ||
    Boolean(registro.es_correccion || registro.registro_origen_id)
  );
}
