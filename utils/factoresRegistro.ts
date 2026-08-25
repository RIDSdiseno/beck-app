type RegistroConAislacion = {
  aislacion?: string | number | null;
  aislacion_aplica?: boolean | null;
  aislacionAplica?: boolean | null;
};

export const ACCESIBILIDAD_OPTIONS = [
  { value: "1", label: "Normal" },
  { value: "2", label: "Cielo Americano o estructurado" },
  { value: "3", label: "Cielo duro y gateras" },
  { value: "0", label: "No aplica" },
];

export function getAislacionOption(registro: RegistroConAislacion) {
  const estadoExplicito = registro.aislacion_aplica ?? registro.aislacionAplica;
  if (estadoExplicito === true) return "1";
  if (estadoExplicito === false) return "0";

  const factor = Number(registro.aislacion);
  if (factor === 0 || factor === 1) return "0";
  return Number.isFinite(factor) && factor > 1 ? "1" : "";
}

export function getAislacionLabel(registro: RegistroConAislacion) {
  const option = getAislacionOption(registro);
  if (option === "1") return "Aplica";
  if (option === "0") return "No aplica";
  return "—";
}

export function getAplicacionLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Aplica" : "No aplica";

  const normalized = String(value).trim().toLowerCase();
  if (["aplica", "sí", "si", "true"].includes(normalized)) return "Aplica";
  if (["no aplica", "false"].includes(normalized)) return "No aplica";

  const numericValue = Number(normalized.replace(",", "."));
  if (!Number.isFinite(numericValue)) return "—";
  return numericValue >= 1 ? "Aplica" : "No aplica";
}
