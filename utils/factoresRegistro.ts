type RegistroConAislacion = {
  aislacion?: string | number | null;
  aislacion_aplica?: boolean | null;
};

export const ACCESIBILIDAD_OPTIONS = [
  { value: "1", label: "Normal" },
  { value: "2", label: "Cielo Americano o estructurado" },
  { value: "3", label: "Cielo duro y gateras" },
  { value: "0", label: "No aplica" },
];

export function getAislacionOption(registro: RegistroConAislacion) {
  if (registro.aislacion_aplica === true) return "1";
  if (registro.aislacion_aplica === false) return "0";

  const factor = Number(registro.aislacion);
  if (factor === 0 || factor === 1) return "0";
  return Number.isFinite(factor) && factor > 1 ? "1" : "";
}
