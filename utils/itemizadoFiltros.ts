// Filtros del selector de Itemizado BECK (supervisor e ingeniería al editar un registro).
// Las opciones de "Tipo", "Elemento atravesado" y "Materialidad" salen solo de los
// itemizados configurados en la obra del registro, y el filtrado se hace en el teléfono.

export type ItemizadoFiltrable = {
  codigo_beck?: string | null;
  tipo?: string | null;
  elemento_pasante?: string | null;
  elemento_penetra?: string | null;
  materialidad?: string | null;
  nombre_personalizado?: string | null;
};

export type FiltrosItemizado = { texto: string; tipo?: string; elementoPenetra: string; materialidad: string };

// "Tabique", "tabique " y "TABIQUE" son la misma opción.
export const claveFiltro = (valor?: string | null) =>
  (valor ?? "").trim().toLocaleLowerCase("es");

const sinAcentos = (valor: string) => valor.normalize("NFD").replace(/\p{Mn}/gu, "");

/** Valores distintos de un campo, con la escritura de la primera vez que aparece. */
function valoresUnicos(items: ItemizadoFiltrable[], campo: "tipo" | "elemento_penetra" | "materialidad") {
  const porClave = new Map<string, string>();
  for (const item of items) {
    const valor = item[campo]?.trim();
    if (valor && !porClave.has(claveFiltro(valor))) porClave.set(claveFiltro(valor), valor);
  }
  return [...porClave.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/**
 * Opciones de cada filtro, en cascada: el tipo acota los elementos atravesados, y ambos
 * acotan las materialidades, para no ofrecer combinaciones sin resultados.
 */
export function opcionesFiltroItemizado(
  items: ItemizadoFiltrable[],
  elegidos: { tipo?: string; elementoPenetra?: string },
) {
  const delTipo = elegidos.tipo ? items.filter((i) => claveFiltro(i.tipo) === elegidos.tipo) : items;
  const delElemento = elegidos.elementoPenetra
    ? delTipo.filter((i) => claveFiltro(i.elemento_penetra) === elegidos.elementoPenetra)
    : delTipo;
  return {
    tipos: valoresUnicos(items, "tipo"),
    elementosPenetra: valoresUnicos(delTipo, "elemento_penetra"),
    materialidades: valoresUnicos(delElemento, "materialidad"),
  };
}

export function filtrarItemizados<T extends ItemizadoFiltrable>(items: T[], filtros: FiltrosItemizado): T[] {
  const texto = sinAcentos(filtros.texto.trim().toLocaleLowerCase("es"));
  return items.filter((item) => {
    if (filtros.tipo && claveFiltro(item.tipo) !== filtros.tipo) return false;
    if (filtros.elementoPenetra && claveFiltro(item.elemento_penetra) !== filtros.elementoPenetra) return false;
    if (filtros.materialidad && claveFiltro(item.materialidad) !== filtros.materialidad) return false;
    if (!texto) return true;
    return [item.codigo_beck, item.tipo, item.elemento_pasante, item.nombre_personalizado, item.elemento_penetra, item.materialidad]
      .some((v) => v && sinAcentos(v.toLocaleLowerCase("es")).includes(texto));
  });
}
