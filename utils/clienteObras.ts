import type { ObraCliente } from "@/services/api/clienteApi";

export type ClienteObraFiltro = "todas" | "pendientes" | "validadas";

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
