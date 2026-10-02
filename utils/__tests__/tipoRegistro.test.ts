import { filtrarPorTipoRegistro } from "../tipoRegistro";

const registros = [
  { id: "1", tipo_registro: "sello_cortafuego", estado: "pendiente" },
  { id: "2", tipo_registro: "junta_lineal_espuma", estado: "pendiente" },
  { id: "3", tipo_registro: "tabiqueria", estado: "rechazado" },
  { id: "4", tipo_registro: "sello_cortafuego", estado: "rechazado" },
];

describe("Filtro por tipo de registro del operario", () => {
  it("muestra todos los tipos cuando no hay selección", () => {
    expect(filtrarPorTipoRegistro(registros, null)).toEqual(registros);
  });

  it.each([
    ["sello_cortafuego", ["1", "4"]],
    ["junta_lineal_espuma", ["2"]],
    ["tabiqueria", ["3"]],
  ] as const)("filtra %s sin mezclar otros tipos", (tipo, ids) => {
    expect(filtrarPorTipoRegistro(registros, tipo).map((r) => r.id)).toEqual(ids);
  });

  it("permite combinar tipo y estado sin modificar los registros originales", () => {
    const resultado = filtrarPorTipoRegistro(registros, "sello_cortafuego");
    expect(resultado.filter((r) => r.estado === "pendiente").map((r) => r.id)).toEqual(["1"]);
    expect(registros).toHaveLength(4);
    expect(resultado[0]).toBe(registros[0]);
  });

  it("devuelve una lista vacía cuando el tipo no tiene registros", () => {
    expect(filtrarPorTipoRegistro([registros[0]], "tabiqueria")).toEqual([]);
  });

  it("no clasifica registros sin tipo como sellos", () => {
    const sinTipo = [{ id: "legacy", tipo_registro: null }];
    expect(filtrarPorTipoRegistro(sinTipo, null)).toEqual(sinTipo);
    expect(filtrarPorTipoRegistro(sinTipo, "sello_cortafuego")).toEqual([]);
  });
});
