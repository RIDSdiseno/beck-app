import type { FirematProducto } from "@/services/api/firematApi";

// El DTO tiene campos escalares: conservar referencias permite que React.memo
// omita las tarjetas sin cambios, sin perder datos usados al abrir el ajuste.
export function reconcileFirematProducts(previous: FirematProducto[], incoming: FirematProducto[]) {
  const byId = new Map(previous.map((product) => [product.id, product]));
  const next = incoming.map((product) => {
    const old = byId.get(product.id);
    if (!old) return product;
    const keys = Object.keys(product) as (keyof FirematProducto)[];
    return keys.length === Object.keys(old).length && keys.every((key) => Object.is(old[key], product[key]))
      ? old : product;
  });
  return next.length === previous.length && next.every((product, index) => product === previous[index])
    ? previous : next;
}
