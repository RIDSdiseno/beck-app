import type { ObraCliente } from "@/services/api/clienteApi";

export type ClienteObraFiltro = "todas" | "pendientes" | "validadas";

export function sumarSellosCliente(obras: ObraCliente[]): number | null {
  // Un backend anterior no entrega esta métrica: no confundir ausencia con cero.
  if (obras.some((obra) => typeof obra.cantidadSellos !== "number" || !Number.isFinite(obra.cantidadSellos) || obra.cantidadSellos < 0)) return null;
  return obras.reduce((total, obra) => total + (obra.cantidadSellos ?? 0), 0);
}

export function resumirObrasCliente(obras: ObraCliente[]) {
  const pendientes = obras.reduce(
    (sum, obra) => sum + obra.registrosPendientes,
    0,
  );
  const validados = obras.reduce(
    (sum, obra) => sum + obra.registrosValidados,
    0,
  );
  const total = pendientes + validados;
  return {
    pendientes,
    validados,
    total,
    obras: obras.length,
    obrasPendientes: obras.filter((obra) => obra.registrosPendientes > 0)
      .length,
    avance: total ? Math.round((validados / total) * 100) : 0,
  };
}

function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filtrarObrasCliente(
  obras: ObraCliente[],
  filtro: ClienteObraFiltro,
  search = "",
) {
  const term = normalizar(search);
  return obras.filter((obra) => {
    const matchesSearch =
      !term || normalizar(`${obra.nombre} ${obra.codigo || ""}`).includes(term);
    const matchesState =
      filtro === "pendientes"
        ? obra.registrosPendientes > 0
        : filtro === "validadas"
          ? obra.registrosValidados > 0
          : true;
    return matchesSearch && matchesState;
  });
}
