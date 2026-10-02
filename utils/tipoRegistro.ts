export type TipoRegistro = "sello_cortafuego" | "junta_lineal_espuma" | "tabiqueria";

export function filtrarPorTipoRegistro<T extends { tipo_registro?: string | null }>(
  registros: T[],
  tipo: TipoRegistro | null,
): T[] {
  return tipo === null
    ? registros
    : registros.filter((registro) => registro.tipo_registro === tipo);
}

export function tipoRegistroLabel(tipo?: string | null) {
  switch (tipo) {
    case "junta_lineal_espuma": return "Junta lineal espuma";
    case "tabiqueria": return "Tabiquería";
    case "sello_cortafuego": return "Sello cortafuego";
    default: return tipo || "Registro";
  }
}
export function tipoRegistroIcon(tipo?: string | null): "ruler" | "wall" | "fire" | "clipboard-text-outline" {
  switch (tipo) {
    case "junta_lineal_espuma": return "ruler";
    case "tabiqueria": return "wall";
    case "sello_cortafuego": return "fire";
    default: return "clipboard-text-outline";
  }
}
