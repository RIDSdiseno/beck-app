import { getConfiguracionRegistro } from "./obrasApi";
import { crearVisibilidadCliente, type ClienteVisibilidad } from "@/utils/clienteVisibilidad";

export async function cargarVisibilidadCliente(obraIds: string[]): Promise<Record<string, ClienteVisibilidad>> {
  const ids = [...new Set(obraIds)];
  if (ids.some((id) => !id)) throw new Error("No se pudo identificar la obra para consultar los campos visibles.");
  const result: Record<string, ClienteVisibilidad> = {};
  // Una consulta por obra, con concurrencia limitada incluso en historiales extensos.
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(ids.slice(i, i + 4).map(async (id) => {
      result[id] = crearVisibilidadCliente(await getConfiguracionRegistro(id, "cliente", true));
    }));
  }
  return result;
}
