import { reconcileBodegaItems } from "../reconcileBodegaItems";

const a = { id: "a", stock: 2, codes: ["A-1"], owner: { name: "Supervisor" } };
const b = { id: "b", stock: 4, codes: [], owner: null };

describe("reconcileBodegaItems", () => {
  it("conserva la lista y tarjetas si el servidor devuelve los mismos datos", () => {
    const previous = [a, b];
    const incoming = JSON.parse(JSON.stringify(previous));
    expect(reconcileBodegaItems(previous, incoming)).toBe(previous);
  });
  it("actualiza stock sin reemplazar tarjetas sin cambios", () => {
    const next = reconcileBodegaItems([a, b], [{ ...a, stock: 5 }, { ...b }]);
    expect(next[0].stock).toBe(5);
    expect(next[0]).not.toBe(a);
    expect(next[1]).toBe(b);
  });
  it("detecta cambios en códigos y responsables anidados", () => {
    expect(reconcileBodegaItems([a], [{ ...a, codes: ["A-2"] }])[0]).not.toBe(
      a,
    );
    expect(
      reconcileBodegaItems([a], [{ ...a, owner: { name: "Otro" } }])[0],
    ).not.toBe(a);
  });
  it("quita artículos ausentes en un refresh y respeta el orden nuevo", () => {
    expect(reconcileBodegaItems([a, b], [b])).toEqual([b]);
    expect(reconcileBodegaItems([a, b], [b, a])).toEqual([b, a]);
    expect(reconcileBodegaItems([a], [])).toEqual([]);
  });
  it("concatena páginas sin duplicados y recoge cambios en filas repetidas", () => {
    const next = reconcileBodegaItems([a], [{ ...a, stock: 7 }, b, b], true);
    expect(next).toHaveLength(2);
    expect(next[0].stock).toBe(7);
    expect(next[1]).toBe(b);
  });
  it("mantiene las filas ante una página vacía", () => {
    const previous = [a, b];
    expect(reconcileBodegaItems(previous, [], true)).toBe(previous);
  });
  it("compara propiedades sin depender del orden y detecta claves eliminadas", () => {
    expect(
      reconcileBodegaItems(
        [a],
        [{ owner: a.owner, codes: a.codes, stock: 2, id: "a" }],
      )[0],
    ).toBe(a);
    expect(
      reconcileBodegaItems<{ id: string; stock?: number }>(
        [{ id: "a", stock: 2 }],
        [{ id: "a" }],
      ),
    ).toEqual([{ id: "a" }]);
  });
});
