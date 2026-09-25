import { matchesClienteFecha, matchesClienteRegistro } from "../clienteRegistros";

const registro = {
  numeroSello: "0042",
  piso: "-1",
  nombreSellador: "José González",
  sellador: "",
  folio: "JL-012",
  recinto: "Sala eléctrica",
  ejeNumerico: "8-9",
  ejeAlfabetico: "B-C",
  descripcionMaterial: "Collarín cortafuego 60 mm",
};

describe("búsqueda de pendientes del cliente", () => {
  it("incluye todos los registros con una búsqueda vacía", () => {
    expect(matchesClienteRegistro(registro, "  ")).toBe(true);
  });
  it("encuentra sello y piso sin cambiar ceros ni signos", () => {
    expect(matchesClienteRegistro(registro, "0042")).toBe(true);
    expect(matchesClienteRegistro(registro, "sello 0042")).toBe(true);
    expect(matchesClienteRegistro(registro, "piso -1")).toBe(true);
  });
  it("busca recinto, ambos ejes y descripción sin depender de tildes o mayúsculas", () => {
    for (const query of ["sala electrica", "8-9", "b-c", "COLLARIN", "60 mm"]) {
      expect(matchesClienteRegistro(registro, query)).toBe(true);
    }
  });
  it("no busca responsable ni folio y descarta coincidencias inexistentes", () => {
    expect(matchesClienteRegistro(registro, "jl-012")).toBe(false);
    expect(matchesClienteRegistro(registro, "jose gonzalez")).toBe(false);
    expect(matchesClienteRegistro(registro, "piso 20")).toBe(false);
    expect(
      matchesClienteRegistro(
        {
          numeroSello: "",
          piso: "",
          recinto: null,
          ejeNumerico: "",
          ejeAlfabetico: "",
          descripcionMaterial: null,
        },
        "0042",
      ),
    ).toBe(false);
  });
  it("filtra por la fecha de ejecución sin desplazarla al día anterior", () => {
    expect(matchesClienteFecha("2026-08-21T00:00:00.000Z", "2026-08-21")).toBe(true);
    expect(matchesClienteFecha("2026-08-21T00:00:00.000Z", "2026-08-20")).toBe(false);
    expect(matchesClienteFecha("2026-08-21", "2026-08-21")).toBe(true);
    expect(matchesClienteFecha(null, "2026-08-21")).toBe(false);
    expect(matchesClienteFecha(null, "")).toBe(true);
  });
  it("combina búsqueda y fecha y recupera todos al limpiar los filtros", () => {
    const rows = [
      { ...registro, fecha: "2026-09-25T00:00:00.000Z" },
      { ...registro, fecha: "2026-09-24T00:00:00.000Z" },
      { ...registro, descripcionMaterial: "Espuma", fecha: "2026-09-25T00:00:00.000Z" },
    ];
    const filter = (query: string, date: string) => rows.filter((row) =>
      matchesClienteRegistro(row, query) && matchesClienteFecha(row.fecha, date));
    expect(filter("collarin", "2026-09-25")).toEqual([rows[0]]);
    expect(filter("", "")).toHaveLength(3);
  });
});
