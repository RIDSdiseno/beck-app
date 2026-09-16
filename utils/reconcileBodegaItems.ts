// Los DTO de bodega son datos JSON, incluidos arreglos de códigos y relaciones.
function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        sameData(left[key], right[key]),
    )
  );
}

export function reconcileBodegaItems<T extends { id: string }>(
  previous: T[],
  incoming: T[],
  append = false,
): T[] {
  const oldById = new Map(previous.map((item) => [item.id, item]));
  const nextById = new Map(append ? oldById : []);
  for (const item of incoming) {
    const old = oldById.get(item.id);
    nextById.set(item.id, old && sameData(old, item) ? old : item);
  }
  const next = Array.from(nextById.values());
  return next.length === previous.length &&
    next.every((item, index) => item === previous[index])
    ? previous
    : next;
}
