import type { RegistroCliente } from "@/services/api/clienteApi";
import type { RegistroHistorialApi } from "@/services/api/registrosApi";

function isHistorial(
  registro: RegistroHistorialApi | RegistroCliente,
): registro is RegistroHistorialApi {
  return "tipo_registro" in registro;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function matchesRegistroHistorySearch(
  registro: RegistroHistorialApi | RegistroCliente,
  query: string,
) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const numeroSello = isHistorial(registro)
    ? registro.numero_sello
    : registro.numeroSello;
  const piso = registro.piso;

  return [
    numeroSello,
    `sello ${numeroSello ?? ""}`,
    piso,
    `piso ${piso ?? ""}`,
  ].some((value) => normalize(value).includes(normalizedQuery));
}

export function matchesRegistroHistoryResponsible(
  registro: RegistroHistorialApi,
  query: string,
) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const responsable = registro.usuarios?.nombre || registro.nombre_sellador;
  return normalize(responsable).includes(normalizedQuery);
}
